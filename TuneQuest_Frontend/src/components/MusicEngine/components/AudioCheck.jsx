import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { makeDetectors } from '../utils/audioDetectors';
import { correctOctave, getAllNotePositions } from '../utils/pitchDetection';
import { getFFTPeaks, detectChord } from '../utils/chordDetection';
import useMetronome from '../../../hooks/useMetronome';
import MetronomeBar from './MetronomeBar';

// ─── Test sequence run at startup ────────────────────────────────────────────
const TESTS = [
  { type: 'note',  label: 'Pluck your 1st string',  hint: 'High E  (e)',  string: 1 },
  { type: 'chord', label: 'Strum an Em chord',        hint: 'Open chord',  chord:  'Em' },
  { type: 'note',  label: 'Pluck your 3rd string',   hint: 'G string',    string: 3 },
  { type: 'chord', label: 'Strum an Am chord',        hint: 'Open chord',  chord:  'Am' },
  { type: 'note',  label: 'Pluck your 6th string',   hint: 'Low E  (E)',  string: 6 },
];

// ─── AudioCheck ────────────────────────────────────────────────────────────────
// Pre-flight screen: tests microphone signal, pitch detection, and chord detection
// before letting the user enter the game. onPass(gainLevel) is called on success.
const AudioCheck = ({ onPass }) => {
  const canvasRef           = useRef(null);
  const animRef             = useRef(null);
  const audioCtxRef         = useRef(null);
  const streamRef           = useRef(null);
  const gainNodeRef         = useRef(null);
  const analyserCheckRef    = useRef(null);
  const waveformContainerRef = useRef(null); // used by MetronomeBar for border-pulse

  const [status, setStatus]             = useState('idle');
  const [volume, setVolume]             = useState(0);
  const [pitch, setPitch]               = useState(null);
  const [noteInfo, setNoteInfo]         = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [signalOk, setSignalOk]         = useState(false);
  const [gainLevel, setGainLevel]       = useState(2);
  const [liveChord, setLiveChord]       = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [chordConfidence, setChordConfidence] = useState(0);
  const [calibrating, setCalibrating]   = useState(false);
  const [testStep, setTestStep]         = useState(0);

  const metronome = useMetronome(80);

  const cleanup = useCallback(() => {
    metronome.stop();
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }, [metronome]);

  const startCheck = useCallback(async () => {
    setStatus('requesting');
    setTestStep(0);
    setCalibrating(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      audioCtxRef.current = audioCtx;

      const source   = audioCtx.createMediaStreamSource(stream);
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = gainLevel;
      gainNodeRef.current = gainNode;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 4096; // 4096 is sufficient for chord detection and halves FFT work
      source.connect(gainNode);
      gainNode.connect(analyser);
      analyserCheckRef.current = analyser;

      const detect = makeDetectors(audioCtx.sampleRate);
      const buffer = new Float32Array(analyser.fftSize);
      const canvas = canvasRef.current;
      const ctx    = canvas.getContext('2d');
      // Gate mic detection for 120 ms after each metronome click so the speaker
      // transient cannot be mistaken for a guitar note or chord.
      const METRO_GATE_MS = 120;

      setStatus('active');
      let signalFrames     = 0;
      let lastValidPitch   = null;
      let lastValidPositions = [];
      let lastValidTime    = 0;
      let lastValidChord   = null;
      let lastValidChordTime = 0;
      let drawFrame        = 0;
      const PITCH_HOLD_MS = 150;  // short hold — don't ghost notes after signal drops
      const CHORD_HOLD_MS = 600;  // hold chord display longer to smooth over missed frames

      // calibration + test tracking (closure-local so no stale-closure issues)
      let calibrated      = false;
      let currentTestStep = 0;
      let testAdvanceAt   = 0;

      const draw = () => {
        drawFrame++;
        analyser.getFloatTimeDomainData(buffer);

        // RMS volume — scale by 500 so typical mic input shows 25–75% range
        let rms = 0;
        for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i];
        rms = Math.sqrt(rms / buffer.length);
        const vol = Math.min(100, Math.round(rms * 500));
        setVolume(vol);

        const raw      = detect(buffer);
        // Skip pitch & chord detection immediately after a metronome click
        const gated = metronome.isPlaying &&
          (performance.now() - metronome.lastTickRef.current) < METRO_GATE_MS;
        const detected = gated ? null : correctOctave(raw);
        const now      = performance.now();

        let freshPositions = []; // positions from THIS frame only (not held), used by test checks
        if (detected && detected > 70 && detected < 1400) {
          const rounded   = Math.round(detected);
          freshPositions              = getAllNotePositions(detected);
          lastValidPitch     = rounded;
          lastValidPositions = freshPositions;
          lastValidTime      = now;
          setPitch(rounded);
          setNoteInfo(freshPositions);
          if (vol > 3) {
            signalFrames++;
            if (signalFrames > 10) setSignalOk(true);
          }
        } else if (now - lastValidTime < PITCH_HOLD_MS && lastValidPitch) {
          setPitch(lastValidPitch);
          setNoteInfo(lastValidPositions);
        } else {
          setPitch(null);
          setNoteInfo([]);
        }

        // Chord detection — only run every 8th frame, when signal is strong, and not gated
        if (!gated && drawFrame % 8 === 0 && analyserCheckRef.current && rms > 0.015) {
          const peaks = getFFTPeaks(analyserCheckRef.current, audioCtx.sampleRate);
          const chord = detectChord(peaks);
          if (chord && chord.score >= 2.0) {
            lastValidChord = {
              root: chord.root,
              suffix: chord.suffix,
              confidence: Math.min(100, Math.round((chord.score / 4) * 100)),
            };
            lastValidChordTime = now;
          }
        }
        if (lastValidChord && now - lastValidChordTime < CHORD_HOLD_MS && rms > 0.015) {
          setLiveChord(`${lastValidChord.root}${lastValidChord.suffix}`);
          setChordConfidence(lastValidChord.confidence);
        } else if (rms <= 0.015 || now - lastValidChordTime >= CHORD_HOLD_MS) {
          lastValidChord = null;
          setLiveChord(null);
          setChordConfidence(0);
        }

        // ── Calibration gate ─────────────────────────────────────────────────
        // makeDetectors runs 40 internal frames of noise-floor calibration;
        // we mirror that with a 44-frame countdown so the UI signals when it
        // is safe to start the test sequence.
        if (!calibrated) {
          if (drawFrame === 1) setCalibrating(true);
          if (drawFrame >= 44) {
            calibrated = true;
            setCalibrating(false);
          }
        }

        // ── Test sequence advancement ────────────────────────────────────────
        if (calibrated && currentTestStep < TESTS.length && now - testAdvanceAt > 800) {
          const step   = TESTS[currentTestStep];
          let   passed = false;
          if (step.type === 'note' && freshPositions.some(p => p.stringNum === step.string)) {
            passed = true;
          } else if (step.type === 'chord' && lastValidChord &&
                     `${lastValidChord.root}${lastValidChord.suffix}` === step.chord) {
            passed = true;
          }
          if (passed) {
            currentTestStep++;
            setTestStep(currentTestStep);
            testAdvanceAt = now;
          }
        }

        // Draw waveform
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        // Subtle grid
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth   = 1;
        for (let g = 1; g < 4; g++) {
          ctx.beginPath(); ctx.moveTo(0, (H / 4) * g); ctx.lineTo(W, (H / 4) * g); ctx.stroke();
        }

        // Waveform gradient
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0,   '#5fe0c0');
        grad.addColorStop(0.5, '#9f86ff');
        grad.addColorStop(1,   '#5fe0c0');
        ctx.strokeStyle = grad;
        ctx.lineWidth   = 2;
        ctx.shadowColor = '#815cf9';
        ctx.shadowBlur  = vol > 8 ? 10 : 2;
        ctx.beginPath();
        const DRAW_POINTS = 256;
        const step  = Math.ceil(buffer.length / DRAW_POINTS);
        const slice = W / DRAW_POINTS;
        let x = 0, pt = 0;
        for (let i = 0; i < buffer.length; i += step) {
          const y = H / 2 + buffer[i] * (H * 0.42);
          pt === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          x += slice;
          pt++;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        animRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentional closure for continuous audio processing

  const handleContinue    = () => { cleanup(); onPass(gainLevel); };
  const handleGainChange  = (val) => {
    setGainLevel(val);
    if (gainNodeRef.current) gainNodeRef.current.gain.value = val;
  };

  useEffect(() => () => cleanup(), [cleanup]);

  const volPct   = Math.min(100, volume);
  const volColor = volume < 10 ? 'rgba(255,255,255,0.15)' : volume < 30 ? '#facc15' : '#5fe0c0';

  return (
    <Container fluid className="min-h-screen d-flex align-items-center justify-content-center" style={{ padding: '3rem 1.5rem' }}>
      <Row className="justify-content-center w-100">
        <Col lg={8} xl={7}>
          {/* Header */}
          <Row className="mb-5">
            <Col className="text-center">
              <p className="text-[10px] tracking-[0.6em] uppercase mb-3 opacity-50" style={{ color: 'var(--muted)' }}>
                Pre-flight check
              </p>
              <h2 className="text-5xl font-black tracking-tight mb-2" style={{ color: 'var(--text)' }}>Audio Input</h2>
              <p className="text-[10px] tracking-[0.4em] uppercase" style={{ color: 'var(--muted)' }}>
                Confirm your guitar signal before entering practice mode
              </p>
            </Col>
          </Row>

          {/* Waveform */}
          <Row className="mb-3 justify-content-center">
            <Col lg={10}>
              <div ref={waveformContainerRef} className="position-relative w-100 rounded-3 overflow-hidden" style={{ background: 'var(--panel-1)', border: '2px solid transparent', transition: 'border-color 0.1s, box-shadow 0.1s' }}>
                <canvas ref={canvasRef} width={560} height={80} className="w-100 rounded-3 d-block" />
                {status === 'idle' ? (
                  <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center rounded-3" style={{ background: 'rgba(0,0,0,0.8)', zIndex: 2 }}>
                    <p className="mb-0 text-[10px] tracking-[0.4em] uppercase" style={{ color: 'var(--muted)' }}>
                      Waveform inactive
                    </p>
                  </div>
                ) : (
                  <div
                    className="position-absolute top-0 start-50 translate-middle-x pt-2 text-[9px] uppercase tracking-widest text-center"
                    style={{ color: 'var(--muted)', zIndex: 1 }}
                  >
                    Live Waveform
                  </div>
                )}
              </div>
            </Col>
          </Row>

          {/* Volume bar */}
          <Row className="mb-4 justify-content-center">
            <Col lg={10}>
              <div className="d-flex justify-content-center text-[10px] uppercase tracking-widest mb-3 gap-3">
                <span style={{ color: 'var(--muted)' }}>Microphone Input Level:</span>
                <span style={{ color: volColor }} className="font-bold">
                  {volume > 0 ? `${volume}%` : '—'}
                </span>
              </div>
              <div className="w-full h-[6px] rounded-full overflow-hidden" style={{ background: 'var(--panel-2)' }}>
                <div
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${volPct}%`,
                    backgroundColor: volColor,
                    boxShadow: volume > 8 ? `0 0 10px ${volColor}88` : 'none',
                  }}
                />
              </div>
            </Col>
          </Row>

          {/* Metronome */}
          <Row className="mb-4 justify-content-center">
            <Col lg={10}>
              <MetronomeBar
                bpm={metronome.bpm}
                isPlaying={metronome.isPlaying}
                currentBeat={metronome.currentBeat}
                soundProfile={metronome.soundProfile}
                setSoundProfile={metronome.setSoundProfile}
                onToggle={() => {
                  if (metronome.isPlaying) {
                    metronome.stop();
                  } else if (audioCtxRef.current) {
                    metronome.start(audioCtxRef.current);
                  }
                }}
                onBpmChange={metronome.setBpm}
                waveformRef={waveformContainerRef}
              />
            </Col>
          </Row>

          {/* Gain slider */}
          <Row className="mb-4 justify-content-center">
            <Col lg={6} md={8} xs={10} className="d-flex flex-column align-items-center">
              <div className="d-flex justify-content-center text-[10px] uppercase tracking-widest mb-3 gap-3 w-100">
                <span style={{ color: 'var(--muted)' }}>Microphone Input Gain:</span>
                <span className="font-bold font-mono" style={{ color: 'var(--accent)' }}>{gainLevel}x</span>
              </div>
              <input
                type="range" min="1" max="20" step="0.5"
                value={gainLevel}
                onChange={e => handleGainChange(Number(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                style={{
                  accentColor: 'var(--primary)',
                  background: `linear-gradient(to right, var(--primary) ${(gainLevel / 20) * 100}%, var(--panel-2) ${(gainLevel / 20) * 100}%)`,
                  width: '100%',
                }}
              />
              <div className="d-flex justify-content-between w-100 mt-2 px-1">
                <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--muted)', opacity: 0.5 }}>1x</span>
                <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--muted)', opacity: 0.5 }}>10x</span>
                <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--muted)', opacity: 0.5 }}>20x</span>
              </div>
              <span style={{ color: 'var(--muted)', opacity: 0.5 }}>Recommended Input: 12.5x</span>
              <span style={{ color: 'var(--muted)', opacity: 0.5 }}>Computer Microphone: 16x to 20x</span>
            </Col>
          </Row>

          {/* Calibrating indicator */}
          {status === 'active' && calibrating && (
            <Row className="mb-4 justify-content-center">
              <Col lg={10}>
                <div className="card text-center" style={{ padding: '1.5rem' }}>
                  <div className="d-flex justify-content-center align-items-center gap-3 mb-3">
                    <div
                      className="animate-spin"
                      style={{
                        width: '18px', height: '18px', borderRadius: '50%',
                        border: '2px solid var(--panel-2)',
                        borderTopColor: 'var(--primary)',
                        flexShrink: 0,
                      }}
                    />
                    <p className="mb-0 text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                      Calibrating audio detector…
                    </p>
                  </div>
                  <p className="text-[9px] uppercase tracking-wider mb-0" style={{ color: 'var(--muted)', opacity: 0.5 }}>
                    Stay quiet for a moment while we measure the noise floor
                  </p>
                </div>
              </Col>
            </Row>
          )}

          {/* 5-step test sequence */}
          {status === 'active' && !calibrating && (
            <Row className="mb-4 justify-content-center">
              <Col lg={10}>

                {/* Progress dots */}
                <div className="d-flex justify-content-center mb-4" style={{ gap: '10px' }}>
                  {TESTS.map((_, i) => (
                    <div key={i} style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: i < testStep ? 'var(--accent)' : i === testStep ? 'var(--primary)' : 'var(--panel-2)',
                      boxShadow: i === testStep ? '0 0 10px var(--primary)' : i < testStep ? '0 0 6px var(--accent)' : 'none',
                      transition: 'all 0.35s ease',
                    }} />
                  ))}
                </div>

                {testStep < TESTS.length ? (
                  <div className="card text-center">
                    <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
                      Test {testStep + 1} of {TESTS.length}
                    </p>
                    <p className="text-2xl font-black mb-1" style={{ color: 'var(--text)' }}>
                      {TESTS[testStep].label}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--accent)', opacity: 0.8 }}>
                      {TESTS[testStep].hint}
                    </p>

                    {/* Live feedback — note test */}
                    {TESTS[testStep].type === 'note' && (
                      <div className="d-flex justify-content-center align-items-center" style={{ gap: '12px' }}>
                        <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Detected:</span>
                        <span className="font-mono font-bold" style={{ color: pitch ? 'var(--text)' : 'var(--muted)' }}>
                          {pitch ? `${pitch} Hz` : '—'}
                        </span>
                        {noteInfo && noteInfo.length > 0 && (
                          <span className="font-mono text-sm font-black" style={{
                            color: noteInfo.some(p => p.stringNum === TESTS[testStep].string) ? 'var(--accent)' : 'var(--muted)',
                            transition: 'color 0.2s',
                          }}>
                            {noteInfo[0]?.noteLabel} · s{noteInfo[0]?.stringNum}
                            {noteInfo.some(p => p.stringNum === TESTS[testStep].string) && (
                              <span style={{ marginLeft: '6px', color: 'var(--accent)' }}>✓</span>
                            )}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Live feedback — chord test */}
                    {TESTS[testStep].type === 'chord' && (
                      <div className="d-flex justify-content-center align-items-center" style={{ gap: '12px' }}>
                        <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Detected:</span>
                        <span className="text-2xl font-black font-mono" style={{
                          color: liveChord === TESTS[testStep].chord ? 'var(--accent)'
                               : liveChord ? 'var(--text)' : 'var(--muted)',
                          transition: 'color 0.2s',
                        }}>
                          {liveChord || '—'}
                        </span>
                        {liveChord && (
                          <span className="text-[9px] font-bold uppercase tracking-wider" style={{
                            color: liveChord === TESTS[testStep].chord ? 'var(--accent)' : 'var(--muted)',
                          }}>
                            {liveChord === TESTS[testStep].chord ? '✓ Match!' : 'No match'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="card text-center" style={{ padding: '1.5rem' }}>
                    <p className="text-3xl font-black mb-2" style={{ color: 'var(--accent)' }}>✓ All checks passed!</p>
                    <p className="text-[9px] uppercase tracking-widest mb-0" style={{ color: 'var(--muted)' }}>
                      Your guitar signal and detection are ready
                    </p>
                  </div>
                )}
              </Col>
            </Row>
          )}

          {/* Tips — shown only before the first test begins */}
          {status === 'active' && !calibrating && testStep === 0 && (
            <Row className="mb-3 justify-content-center">
              <Col lg={10} className="text-center">
                <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)', opacity: 0.6 }}>→ Use a direct input / audio interface for best results</p>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)', opacity: 0.6 }}>→ Disable system noise suppression if signal drops</p>
              </Col>
            </Row>
          )}

          {/* CTA */}
          <Row className="justify-content-center">
            <Col lg={10} className="text-center">
              {status === 'idle' && (
                <button
                  onClick={startCheck}
                  className="btn btn-primary text-sm tracking-[0.2em] uppercase"
                  style={{ padding: '14px 56px', borderRadius: '999px' }}
                >
                  Test Microphone
                </button>
              )}
              {status === 'requesting' && (
                <p className="text-[10px] uppercase tracking-widest animate-pulse" style={{ color: 'var(--muted)' }}>
                  Requesting access…
                </p>
              )}
              {status === 'error' && (
                <div className="text-center space-y-3">
                  <p className="text-xs uppercase tracking-widest" style={{ color: '#ef4444' }}>Mic access denied or unavailable</p>
                  <button
                    onClick={startCheck}
                    className="btn text-xs tracking-widest uppercase"
                    style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', padding: '10px 32px', borderRadius: '999px', background: 'transparent' }}
                  >
                    Retry
                  </button>
                </div>
              )}
              {status === 'active' && testStep === TESTS.length && (
                <button
                  onClick={handleContinue}
                  className="btn btn-primary text-sm tracking-[0.2em] uppercase"
                  style={{ padding: '14px 56px', borderRadius: '999px' }}
                >
                  ✓  Enter Practice Mode
                </button>
              )}
              {status === 'active' && testStep < TESTS.length && (
                <button
                  onClick={handleContinue}
                  className="text-[10px] uppercase tracking-widest transition-colors mt-1"
                  style={{ color: 'var(--muted)', opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Skip check →
                </button>
              )}
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default AudioCheck;
