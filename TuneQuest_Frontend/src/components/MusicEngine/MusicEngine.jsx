import React, { useEffect, useRef, useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import * as PIXI from 'pixi.js';
import Soundfont from 'soundfont-player';

// Constants
import { STRINGS_FREQ, NOTE_POOL } from './constants/guitar';
import { GAME_CHORDS } from './constants/chords';

// Utils
import { correctOctave, getAllNotePositions } from './utils/pitchDetection';
import { getFFTPeaks, detectChord } from './utils/chordDetection';
import { makeDetectors } from './utils/audioDetectors';
import { stringFretToSamplerNote, getChordSamplerNotes } from './utils/samplerUtils';

// Game
import { S_TOP, S_GAP } from './game/layout';
import { createNoteSprite } from './game/createNoteSprite';
import { createChordSprite } from './game/createChordSprite';

// Metronome
import useMetronome from '../../hooks/useMetronome';
import MetronomeBar from './components/MetronomeBar';

// Sub-components
import AudioCheck from './components/AudioCheck';
import ChordDiagramCanvas from './components/ChordDiagramCanvas';

// ─── Rhythm-game geometry ──────────────────────────────────────────────────────
// Notes spawn at SPAWN_X and travel left to HIT_X (centre of the cyan pillar).
// Speed is derived so the travel time equals exactly LEAD_BEATS beat intervals,
// syncing the visual hit with the metronome click the player hears.
const SPAWN_X     = 850;                    // px – right-edge spawn position
const HIT_X       = 136;                    // px – centre of green pillar (rect x=133, w=6)
const TRAVEL_DIST = SPAWN_X - HIT_X;        // 714 px
const LEAD_BEATS  = 4;                      // notes travel this many beats before hitting

// ─── MusicalGame ───────────────────────────────────────────────────────────────
const MusicalGame = () => {
  const gameContainerRef   = useRef(null);
  const appRef             = useRef(null);
  const audioContextRef    = useRef(null);    // mic/detection only
  const playbackContextRef = useRef(null);    // soundfont playback — kept clean from mic
  const intervalRef        = useRef(null);
  const requestRef         = useRef(null);
  const gameGainNodeRef    = useRef(null);    // live-adjustable gain for both game modes
  const guitarSamplerRef   = useRef(null);
  const analyserRef        = useRef(null);
  const diagramIdRef       = useRef(0);
  const displayModeRef     = useRef('note');
  const maxFretRef         = useRef(5);
  const speedRef           = useRef(2);
  const noteVolumeRef      = useRef(4);
  const subdivisionRef     = useRef(1);       // 1=quarter, 2=eighth, 4=sixteenth
  const gameCanvasRef      = useRef(null);    // for metronome waveform pulse
  const spawnTickHandlerRef = useRef(null);   // current onTick listener — cleared in stopGame

  // Metronome (BPM drives canvas scroll speed)
  const metronome = useMetronome(80);

  const [score, setScore]                   = useState(0);
  const [currentNote, setCurrentNote]       = useState('-');
  const [screen, setScreen]                 = useState('check');
  const [displayMode, setDisplayMode]       = useState('note');
  const [gainLevel, setGainLevel]           = useState(4);
  const [gameMode, setGameMode]             = useState('notes');
  const [detectedChord, setDetectedChord]   = useState(null);
  const [targetChord, setTargetChord]       = useState(null);
  const [chordHit, setChordHit]             = useState(false);
  const [diagramQueue, setDiagramQueue]     = useState([]);
  const [fadingIds, setFadingIds]           = useState(new Set());
  const [liveHz, setLiveHz]                 = useState(0);
  const [livePositions, setLivePositions]   = useState([]);
  const [maxFret, setMaxFret]               = useState(5);
  const [speed, setSpeed]                   = useState(2);
  const [noteVolume, setNoteVolume]         = useState(4);
  const [subdivision, setSubdivision]       = useState(1); // 1=quarter, 2=eighth, 4=sixteenth
  const [hitFeedback, setHitFeedback]       = useState(''); // 'Perfect!' | 'Good!'

  // Keep refs in sync with state so game loop callbacks always read fresh values
  useEffect(() => { displayModeRef.current = displayMode; }, [displayMode]);
  useEffect(() => { maxFretRef.current = maxFret; },        [maxFret]);
  useEffect(() => { speedRef.current = speed; },            [speed]);
  useEffect(() => { noteVolumeRef.current = noteVolume; },  [noteVolume]);
  useEffect(() => { subdivisionRef.current = subdivision; },[subdivision]);

  // Keep speed in sync with BPM so notes travel exactly LEAD_BEATS beats across TRAVEL_DIST pixels.
  // speed (PIXI units) × 60 fps = px/sec  →  travel_time = TRAVEL_DIST / (speed × 60)
  // We require travel_time = LEAD_BEATS × (60 / bpm)  →  speed = TRAVEL_DIST × bpm / (LEAD_BEATS × 3600)
  useEffect(() => {
    const derived = Math.max(0.5, (TRAVEL_DIST * metronome.bpm) / (LEAD_BEATS * 3600));
    setSpeed(derived);
    speedRef.current = derived;
  }, [metronome.bpm]);

  const handleGameGainChange = (val) => {
    setGainLevel(val);
    if (gameGainNodeRef.current) gameGainNodeRef.current.gain.value = val;
  };

  // Plays real guitar samples via soundfont-player.
  // Uses a dedicated playback AudioContext — fully isolated from the mic input context.
  const playPluck = (noteLabels) => {
    const ctx     = playbackContextRef.current;
    const sampler = guitarSamplerRef.current;
    if (!ctx || ctx.state === 'closed' || !sampler) return;
    const labels = Array.isArray(noteLabels) ? noteLabels : [noteLabels];
    const doPlay = () => labels.forEach(label =>
      sampler.play(label, ctx.currentTime, { duration: 3, gain: noteVolumeRef.current })
    );
    ctx.state === 'suspended' ? ctx.resume().then(doPlay) : doPlay();
  };

  // ─── Helper: draw string lines & left-side labels onto a PIXI stage ───────────
  const drawBoard = (stage) => {
    const board = new PIXI.Graphics();
    STRINGS_FREQ.forEach((_, i) => {
      board.moveTo(0, S_TOP + i * S_GAP).lineTo(800, S_TOP + i * S_GAP).stroke({ width: 2, color: 0x7B3CC4 });
    });
    stage.addChild(board);

    STRINGS_FREQ.forEach((strData, i) => {
      const stringNum = i + 1;
      const noteName  = strData.note.replace(/\d/, '');
      const y         = S_TOP + i * S_GAP;

      const bg = new PIXI.Graphics()
        .roundRect(30, y - 16, 56, 32, 16)
        .fill({ color: 0x1a1a1a, alpha: 0.85 })
        .stroke({ width: 1.5, color: 0x7B3CC4, alpha: 0.4 });
      stage.addChild(bg);

      const numText = new PIXI.Text({ text: stringNum, style: { fontFamily: 'monospace', fontSize: 18, fill: 0x9f86ff, fontWeight: '900' } });
      numText.anchor.set(0.5); numText.x = 48; numText.y = y;
      stage.addChild(numText);

      const noteText = new PIXI.Text({ text: noteName, style: { fontFamily: 'monospace', fontSize: 12, fill: 0xb8b8b8, fontWeight: 'bold' } });
      noteText.anchor.set(0.5); noteText.x = 68; noteText.y = y;
      stage.addChild(noteText);
    });

    stage.addChild(new PIXI.Graphics().rect(133, 0, 6, 420).fill({ color: 0x06D6A0 }));
  };

  // ─── Helper: shared audio context + analyser setup ────────────────────────────
  const setupAudio = async (fftSize = 4096) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') await audioContext.resume();
    audioContextRef.current = audioContext;

    const playbackContext = new (window.AudioContext || window.webkitAudioContext)();
    if (playbackContext.state === 'suspended') await playbackContext.resume();
    playbackContextRef.current = playbackContext;

    guitarSamplerRef.current = null;
    Soundfont.instrument(playbackContext, 'acoustic_guitar_steel').then(guitar => {
      guitarSamplerRef.current = guitar;
    }).catch(() => {});

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, highpassFilter: false },
    });
    const source   = audioContext.createMediaStreamSource(stream);
    const gainNode = audioContext.createGain();
    gainNode.gain.value = gainLevel;
    gameGainNodeRef.current = gainNode;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = fftSize;
    source.connect(gainNode);
    gainNode.connect(analyser);
    analyserRef.current = analyser;

    return { audioContext, analyser };
  };

  // ─── Notes Game ───────────────────────────────────────────────────────────────
  const startGame = async () => {
    setScreen('playing');
    setGameMode('notes');
    setScore(0);
    let notes = [];
    const latestPitchRef = { current: 0 };

    let audioContext, analyser;
    try {
      ({ audioContext, analyser } = await setupAudio(4096));
    } catch (_err) { return; }

    // Gate mic detection for 120 ms after each metronome click transient
    const METRO_GATE_MS  = 120;
    const metLastTickRef = metronome.lastTickRef;

    const app = new PIXI.Application();
    await app.init({ width: 800, height: 420, backgroundColor: 0x5B21B6, antialias: true });
    if (gameContainerRef.current) gameContainerRef.current.appendChild(app.canvas);
    appRef.current = app;

    const detect = makeDetectors(audioContext.sampleRate);
    const buffer = new Float32Array(analyser.fftSize);

    const visualizer = new PIXI.Graphics();
    app.stage.addChild(visualizer);

    let lastValidPitch = 0, lastValidTime = 0;
    const PITCH_HOLD_MS = 1500;

    setLiveHz(-1);
    setLivePositions([]);

    const hzLabel = new PIXI.Text({ text: 'calibrating…', style: { fontFamily: 'monospace', fontSize: 12, fill: 0xAA80D0 } });
    hzLabel.x = 10; hzLabel.y = 8;
    app.stage.addChild(hzLabel);

    const updateAudio = () => {
      analyser.getFloatTimeDomainData(buffer);

      visualizer.clear();
      visualizer.moveTo(0, 400);
      for (let i = 0; i < buffer.length; i += 8) {
        const x = (i / buffer.length) * 800;
        const y = 400 + buffer[i] * 50;
        visualizer.lineTo(x, y).stroke({ width: 1, color: 0x9D4EDD, alpha: 0.45 });
      }

      const raw = detect(buffer);
      // Skip pitch detection immediately after a metronome click transient
      if (metronome.isPlaying &&
          performance.now() - metLastTickRef.current < METRO_GATE_MS) {
        requestRef.current = requestAnimationFrame(updateAudio);
        return;
      }
      if (raw === undefined) {
        requestRef.current = requestAnimationFrame(updateAudio);
        return;
      }

      if (liveHz === -1 || hzLabel.text === 'calibrating…') {
        hzLabel.text = '— Hz';
        hzLabel.style.fill = 0x444444;
        setLiveHz(0);
      }

      const pitch = correctOctave(raw);
      const now   = performance.now();
      if (pitch && pitch > 70 && pitch < 1400) {
        lastValidPitch = pitch;
        lastValidTime  = now;
        latestPitchRef.current = pitch;
        hzLabel.text       = `${Math.round(pitch)} Hz`;
        hzLabel.style.fill = 0xCC99FF;
        setLiveHz(Math.round(pitch));
        setLivePositions(getAllNotePositions(pitch));
      } else if (now - lastValidTime < PITCH_HOLD_MS && lastValidPitch) {
        latestPitchRef.current = lastValidPitch;
        hzLabel.text       = `${Math.round(lastValidPitch)} Hz (hold)`;
        hzLabel.style.fill = 0xAA80D0;
      } else {
        latestPitchRef.current = 0;
        lastValidPitch         = 0;
        hzLabel.text           = '— Hz';
        hzLabel.style.fill     = 0x444444;
        setLiveHz(0);
        setLivePositions([]);
      }
      requestRef.current = requestAnimationFrame(updateAudio);
    };
    updateAudio();

    drawBoard(app.stage);

    const CENTS_TOLERANCE  = 100;
    const PERFECT_WINDOW_MS = 80; // within 80 ms of a beat click = "Perfect"

    // Ticker: move notes + hit detection
    app.ticker.add((ticker) => {
      const p = latestPitchRef.current;
      for (let i = notes.length - 1; i >= 0; i--) {
        const note = notes[i];
        note.x -= speedRef.current * ticker.deltaTime;
        if (note.x > 104 && note.x < 162) {
          note.children[0].tint = 0x06D6A0;
          if (!note.soundPlayed) {
            note.soundPlayed = true;
            playPluck(note.samplerNote);
          }
          if (p > 0) {
            const entry = note.poolEntry;
            const detectedPositions = getAllNotePositions(p);
            const hit = detectedPositions.some(pos => pos.noteLabel === entry.noteLabel)
              || Math.abs(1200 * Math.log2(p / entry.hz)) < CENTS_TOLERANCE;
            if (hit) {
              const isPerfect = (performance.now() - metLastTickRef.current) < PERFECT_WINDOW_MS;
              setScore(s => s + (isPerfect ? 20 : 10));
              setHitFeedback(isPerfect ? 'Perfect!' : 'Good!');
              setTimeout(() => setHitFeedback(''), 600);
              setCurrentNote(`${entry.noteLabel} s${entry.string}f${entry.fret}`);
              app.stage.removeChild(note);
              notes.splice(i, 1);
              latestPitchRef.current = 0;
              continue;
            }
          }
        } else {
          note.children[0].tint = 0xffffff;
        }
        if (note.x < -50) { app.stage.removeChild(note); notes.splice(i, 1); }
      }
    });

    // Per-string pools (fret filter applied live via maxFretRef)
    const poolByString = [1,2,3,4,5,6].map(s => NOTE_POOL.filter(e => e.string === s));

    // ── Beat-synchronized note spawning ────────────────────────────────────────
    // onTick fires (via the lookahead scheduler) with the AudioContext beat time.
    // We convert that future AudioContext time to a wall-clock target so the PIXI
    // ticker can poll and spawn the note at the precise moment the beat sounds.
    // Result: a note spawned on beat N arrives at HIT_X on beat N + LEAD_BEATS.
    const noteSpawnQueue = []; // wall-clock ms targets for upcoming spawns

    const scheduleNoteSpawn = (beat, beatTime) => {
      // For each subdivision push a separate wall-clock spawn time so that
      // sub-beat notes arrive at HIT_X exactly on their respective sub-beat.
      // Sub-beat times are evenly spread across one beat interval.
      const sub = subdivisionRef.current;
      const beatIntervalSec = 60 / metronome.bpmRef.current;
      for (let i = 0; i < sub; i++) {
        const subBeatTime = beatTime + i * beatIntervalSec / sub;
        const wallClock   = performance.now() + (subBeatTime - audioContext.currentTime) * 1000;
        noteSpawnQueue.push(wallClock);
      }
    };
    metronome.onTick(scheduleNoteSpawn);
    spawnTickHandlerRef.current = scheduleNoteSpawn;

    // PIXI ticker drains the queue each frame — max jitter is one frame (~16 ms)
    app.ticker.add(() => {
      const now = performance.now();
      while (noteSpawnQueue.length > 0 && now >= noteSpawnQueue[0]) {
        noteSpawnQueue.shift();
        const stringIdx = Math.floor(Math.random() * 6);
        const filtered  = poolByString[stringIdx].filter(e => e.fret <= maxFretRef.current);
        if (!filtered.length) continue;
        const entry     = filtered[Math.floor(Math.random() * filtered.length)];
        const sprite    = createNoteSprite(entry, displayModeRef.current);
        sprite.x = SPAWN_X; sprite.y = 0;
        sprite.poolEntry   = entry;
        sprite.samplerNote = stringFretToSamplerNote(entry.string, entry.fret);
        sprite.soundPlayed = false;
        app.stage.addChild(sprite);
        notes.push(sprite);
      }
    });
  };

  // ─── Chord Game ───────────────────────────────────────────────────────────────
  const startChordGame = async () => {
    setScreen('playing');
    setGameMode('chords');
    setScore(0);

    let audioContext, analyser;
    try {
      ({ audioContext, analyser } = await setupAudio(8192));
    } catch (_err) { return; }

    // Gate mic detection for 120 ms after each metronome click transient
    const METRO_GATE_MS  = 120;
    const metLastTickRef = metronome.lastTickRef;

    const app = new PIXI.Application();
    await app.init({ width: 800, height: 420, backgroundColor: 0x5B21B6, antialias: true });
    if (gameContainerRef.current) gameContainerRef.current.appendChild(app.canvas);
    appRef.current = app;

    const visualizer = new PIXI.Graphics();
    app.stage.addChild(visualizer);

    const updateChordAudio = () => {
      const timeBuf = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(timeBuf);
      visualizer.clear();
      visualizer.moveTo(0, 400);
      for (let i = 0; i < timeBuf.length; i += 8) {
        const x = (i / timeBuf.length) * 800;
        const y = 400 + timeBuf[i] * 50;
        visualizer.lineTo(x, y).stroke({ width: 1, color: 0x9D4EDD, alpha: 0.4 });
      }

      const peaks = getFFTPeaks(analyser, audioContext.sampleRate);
      let rmsVal = 0;
      for (let i = 0; i < timeBuf.length; i++) rmsVal += timeBuf[i] * timeBuf[i];
      rmsVal = Math.sqrt(rmsVal / timeBuf.length);
      // Skip chord detection immediately after a metronome click transient
      const chordGated = metronome.isPlaying &&
        performance.now() - metLastTickRef.current < METRO_GATE_MS;
      if (!chordGated && rmsVal > 0.015) {
        const chord = detectChord(peaks);
        if (chord && chord.score >= 2.5) setDetectedChord(`${chord.root}${chord.suffix}`);
        else setDetectedChord(null);
      } else {
        setDetectedChord(null);
      }
      requestRef.current = requestAnimationFrame(updateChordAudio);
    };
    updateChordAudio();

    drawBoard(app.stage);

    let chords = [];

    // Ticker: move chords + hit detection
    app.ticker.add((ticker) => {
      for (let i = chords.length - 1; i >= 0; i--) {
        const c = chords[i];
        c.x -= speedRef.current * ticker.deltaTime;
        if (c.x > 104 && c.x < 162) {
          c.children[0].tint = 0x06D6A0;
          setTargetChord(c.chordName);
          if (!c.soundPlayed) {
            c.soundPlayed = true;
            playPluck(c.samplerNotes);
          }
          if (analyserRef.current && audioContextRef.current) {
            const peaks = getFFTPeaks(analyserRef.current, audioContextRef.current.sampleRate);
            const chord = detectChord(peaks);
            if (chord && `${chord.root}${chord.suffix}` === c.chordName && chord.score >= 2.5) {
              setScore(s => s + 20);
              setChordHit(true);
              setTimeout(() => setChordHit(false), 400);
              app.stage.removeChild(c);
              setDiagramQueue(q => {
                const idx = q.findIndex(d => d.chordName === c.chordName);
                if (idx === -1) return q;
                const id = q[idx].id;
                setFadingIds(s => new Set([...s, id]));
                setTimeout(() => {
                  setDiagramQueue(qq => qq.filter(d => d.id !== id));
                  setFadingIds(s => { const ns = new Set(s); ns.delete(id); return ns; });
                }, 400);
                return q;
              });
              chords.splice(i, 1);
              continue;
            }
          }
        } else {
          c.children[0].tint = 0xffffff;
        }
        if (c.x < -80) {
          setDiagramQueue(q => {
            const idx = q.findIndex(d => d.chordName === c.chordName);
            if (idx === -1) return q;
            const id = q[idx].id;
            setFadingIds(s => new Set([...s, id]));
            setTimeout(() => {
              setDiagramQueue(qq => qq.filter(d => d.id !== id));
              setFadingIds(s => { const ns = new Set(s); ns.delete(id); return ns; });
            }, 400);
            return q;
          });
          app.stage.removeChild(c);
          chords.splice(i, 1);
        }
      }
    });

    // ── Beat-synchronized chord spawning ───────────────────────────────────────
    const chordSpawnQueue     = [];
    let   chordScheduledCount  = 0;
    const CHORDS_EVERY_N_BEATS = 4; // one chord per 4 beats (one per measure)

    const scheduleChordSpawn = (beat, beatTime) => {
      const wallClock = performance.now() + (beatTime - audioContext.currentTime) * 1000;
      chordScheduledCount++;
      if (chordScheduledCount % CHORDS_EVERY_N_BEATS !== 0) return;
      chordSpawnQueue.push(wallClock);
    };
    metronome.onTick(scheduleChordSpawn);
    spawnTickHandlerRef.current = scheduleChordSpawn;

    app.ticker.add(() => {
      const now = performance.now();
      while (chordSpawnQueue.length > 0 && now >= chordSpawnQueue[0]) {
        chordSpawnQueue.shift();
        const chordName = GAME_CHORDS[Math.floor(Math.random() * GAME_CHORDS.length)];
        const sprite    = createChordSprite(chordName);
        sprite.x = SPAWN_X; sprite.y = 0;
        sprite.chordName    = chordName;
        sprite.samplerNotes = getChordSamplerNotes(chordName);
        sprite.soundPlayed  = false;
        app.stage.addChild(sprite);
        chords.push(sprite);
        const id = ++diagramIdRef.current;
        setDiagramQueue(q => [...q, { id, chordName }]);
      }
    });
  };

  // ─── Shared cleanup ───────────────────────────────────────────────────────────
  const stopGame = () => {
    // Remove beat-spawn listener before stopping so it doesn't fire on restarts
    if (spawnTickHandlerRef.current) {
      metronome.offTick(spawnTickHandlerRef.current);
      spawnTickHandlerRef.current = null;
    }
    metronome.stop();
    try { appRef.current?.destroy(true, { children: true, texture: true, baseTexture: true }); } catch (e) {}
    clearInterval(intervalRef.current);
    cancelAnimationFrame(requestRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
    audioContextRef.current = null;
    if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') playbackContextRef.current.close();
    playbackContextRef.current = null;
  };

  useEffect(() => () => {
    if (appRef.current) {
      try { appRef.current.destroy(true, { children: true, texture: true, baseTexture: true }); } catch (_err) {}
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
    if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') playbackContextRef.current.close();
  }, []);

  // ─── Screen: AudioCheck ────────────────────────────────────────────────────────
  if (screen === 'check') {
    // Do NOT call setupAudio here (no user gesture). AudioCheck will rely on the
    // graph created when the user starts a game, or we can show a message if missing.
    return (
      <AudioCheck
        onPass={(g) => { setGainLevel(g); setScreen('start'); }}
        audioContextRef={audioContextRef}
        analyserRef={analyserRef}
        gameGainNodeRef={gameGainNodeRef}
      />
    );
  }

  // ─── Screen: Start / Mode Select ──────────────────────────────────────────────
  if (screen === 'start') {
    return (
      <Container fluid className="min-h-screen d-flex align-items-center justify-content-center" style={{ padding: '2rem 1rem' }}>
        <Row className="justify-content-center w-100">
          <Col lg={8} className="text-center">
            <h1 className="text-6xl font-black mb-4 italic tracking-tighter" style={{ color: 'var(--primary-soft)' }}>TUNEQUEST</h1>
            <p className="mb-8 uppercase tracking-[0.3em] text-xs font-bold" style={{ color: 'var(--muted)' }}>Practice Mode</p>
            <div className="flex gap-4 justify-center mb-6">
              <button
                onClick={() => { setGameMode('notes'); startGame(); }}
                className="btn btn-primary font-black text-xl transition-all transform hover:scale-105"
                style={{ padding: '20px 48px', borderRadius: '999px' }}
              >
                🎸 Notes Mode
              </button>
              <button
                onClick={startChordGame}
                className="btn btn-outline font-black text-xl transition-all transform hover:scale-105"
                style={{ padding: '20px 48px', borderRadius: '999px' }}
              >
                🎵 Chords Mode
              </button>
            </div>
            <br />
            <button onClick={() => setScreen('check')} className="text-[10px] uppercase tracking-widest transition-colors" style={{ color: 'var(--muted)', opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer' }}>
              ← Re-run audio check
            </button>
          </Col>
        </Row>
      </Container>
    );
  }

  // ─── Screen: Chords Game Playing ──────────────────────────────────────────────
  if (gameMode === 'chords') {
    return (
      <Container fluid className="min-h-screen d-flex align-items-center justify-content-center" style={{ padding: '2rem 1rem' }}>
        <Row className="justify-content-center w-100">
          <Col xxl={10}>
            {/* Header card */}
            <div className="card mb-4" style={{ padding: '16px 24px' }}>
              <Row className="align-items-center mb-3">
                <Col xs={12} lg={2} className="mb-3 mb-lg-0 d-flex justify-content-center justify-content-lg-start">
                  <button
                    onClick={() => { stopGame(); setScreen('start'); setScore(0); setTargetChord(null); setDetectedChord(null); setDiagramQueue([]); }}
                    className="btn btn-ghost text-[11px] uppercase tracking-widest"
                    style={{ padding: '8px 18px', borderRadius: '999px', color: 'var(--muted)', minWidth: '80px' }}
                  >
                    ← Menu
                  </button>
                </Col>
                <Col xs={12} lg={6} className="mb-3 mb-lg-0">
                  <div className="text-center">
                    <span className="pill" style={{ display: 'inline-flex' }}>🎵 Chord Mode</span>
                    <p className="text-[10px] uppercase tracking-widest mt-2" style={{ color: 'var(--muted)' }}>
                      Strum the chord as it enters the hit zone · diagram appears on spawn
                    </p>
                  </div>
                </Col>
                <Col xs={12} lg={4}>
                  <Row className="justify-content-center justify-content-lg-end g-3">
                    <Col xs="auto">
                      <div className="text-center">
                        <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--muted)' }}>Detected</p>
                        <p className="text-2xl font-mono font-black transition-colors" style={{ color: chordHit ? 'var(--accent)' : 'var(--muted)' }}>
                          {detectedChord || '—'}
                        </p>
                      </div>
                    </Col>
                    <Col xs="auto">
                      <div className="text-center">
                        <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--muted)' }}>Target</p>
                        <p className="text-2xl font-mono font-black" style={{ color: 'var(--text)' }}>{targetChord || '—'}</p>
                      </div>
                    </Col>
                    <Col xs="auto">
                      <div className="text-center">
                        <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--muted)' }}>Score</p>
                        <p className="text-4xl font-mono font-black" style={{ color: 'var(--primary-soft)' }}>{score}</p>
                      </div>
                    </Col>
                  </Row>
                </Col>
              </Row>

              {/* Controls row */}
              <Row className="justify-content-center mt-3 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <Col xl={3} lg={4} md={6} sm={10} xs={12} className="mb-3 d-flex justify-content-center">
                  <div className="d-flex align-items-center gap-3 w-100" style={{ maxWidth: '320px' }}>
                    <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--muted)', minWidth: '32px' }}>Mic Gain</span>
                    <input type="range" min="1" max="20" step="0.5" value={gainLevel}
                      onChange={e => handleGameGainChange(Number(e.target.value))}
                      className="h-1 rounded-full appearance-none cursor-pointer flex-grow-1"
                      style={{ accentColor: 'var(--primary)', background: `linear-gradient(to right, var(--primary) ${(gainLevel/20)*100}%, var(--panel-2) ${(gainLevel/20)*100}%)` }}
                    />
                    <span className="text-[9px] font-mono font-bold" style={{ color: 'var(--accent)', minWidth: '28px' }}>{gainLevel}x</span>
                  </div>
                </Col>
                <Col xl={3} lg={4} md={6} sm={10} xs={12} className="mb-3 d-flex justify-content-center">
                  <div className="d-flex align-items-center gap-3 w-100" style={{ maxWidth: '320px' }}>
                    <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--muted)', minWidth: '24px' }}>Vol</span>
                    <input type="range" min="1" max="20" step="0.5" value={noteVolume}
                      onChange={e => { const v = Number(e.target.value); setNoteVolume(v); noteVolumeRef.current = v; }}
                      className="h-1 rounded-full appearance-none cursor-pointer flex-grow-1"
                      style={{ accentColor: 'var(--accent)', background: `linear-gradient(to right, var(--accent) ${(noteVolume/20)*100}%, var(--panel-2) ${(noteVolume/20)*100}%)` }}
                    />
                    <span className="text-[9px] font-mono font-bold" style={{ color: 'var(--accent)', minWidth: '28px' }}>{noteVolume}x</span>
                  </div>
                </Col>
              </Row>

              {/* Metronome — BPM slider drives scroll speed */}
              <Row className="mt-1 pb-2">
                <Col>
                  <MetronomeBar
                    bpm={metronome.bpm}
                    isPlaying={metronome.isPlaying}
                    currentBeat={metronome.currentBeat}
                    soundProfile={metronome.soundProfile}
                    setSoundProfile={metronome.setSoundProfile}
                    onToggle={() => metronome.isPlaying ? metronome.stop() : metronome.start(audioContextRef.current)}
                    onBpmChange={metronome.setBpm}
                    waveformRef={gameCanvasRef}
                  />
                </Col>
              </Row>
            </div>

            {/* Game canvas */}
            <div style={{ maxWidth: '100%', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <div ref={el => { gameContainerRef.current = el; gameCanvasRef.current = el; }} style={{ maxWidth: '800px', width: '100%', lineHeight: 0 }} className="rounded-[2.5rem] border-[12px] border-[#111] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden game-canvas-wrapper" />
            </div>

            {/* Chord diagrams */}
            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '24px', marginTop: '16px', alignItems: 'flex-start', justifyContent: 'center' }}>
              {diagramQueue.length === 0 ? (
                <p className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--muted)', opacity: 0.5 }}>Diagrams appear when chords spawn</p>
              ) : (
                diagramQueue.slice(-4).map((entry, i, arr) => (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      width: '126px', flexShrink: 0,
                      animation: fadingIds.has(entry.id)
                        ? 'fadeOutDiagram 0.4s ease forwards'
                        : i === arr.length - 1 ? 'slideInRight 0.35s cubic-bezier(0.22,1,0.36,1)' : 'none',
                    }}
                  >
                    <p className="text-xs font-black font-mono mb-2 tracking-wide" style={{ color: 'var(--text)' }}>{entry.chordName}</p>
                    <ChordDiagramCanvas chordName={entry.chordName} />
                  </div>
                ))
              )}
            </div>

            <style>{`
              @keyframes slideInRight {
                from { opacity: 0; transform: translateX(60px); }
                to   { opacity: 1; transform: translateX(0); }
              }
              @keyframes fadeOutDiagram {
                from { opacity: 1; transform: scale(1); }
                to   { opacity: 0; transform: scale(0.85); }
              }
              .game-canvas-wrapper canvas {
                width: 100% !important;
                height: auto !important;
                display: block;
              }
              @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(6px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </Col>
        </Row>
      </Container>
    );
  }

  // ─── Screen: Notes Game Playing ───────────────────────────────────────────────
  return (
    <Container fluid className="min-h-screen d-flex align-items-center justify-content-center" style={{ padding: '2rem 1rem' }}>
      <Row className="justify-content-center w-100">
        <Col xl={10} xxl={9}>
          {/* Header card */}
          <div className="card mb-4" style={{ padding: '16px 24px' }}>
            <Row className="align-items-center mb-3">
              <Col xs={12} lg={2} className="mb-3 mb-lg-0 d-flex justify-content-center justify-content-lg-start">
                <button
                  onClick={() => { stopGame(); setScreen('start'); setScore(0); }}
                  className="btn btn-ghost text-[11px] uppercase tracking-widest"
                  style={{ padding: '8px 18px', borderRadius: '999px', color: 'var(--muted)', minWidth: '80px' }}
                >
                  ← Menu
                </button>
              </Col>
              <Col xs={12} lg={6} className="mb-3 mb-lg-0">
                <div className="text-center">
                  <span className="pill" style={{ display: 'inline-flex' }}>🎸 Notes Mode</span>
                  <div className="d-flex flex-wrap gap-2 justify-content-center mt-2">
                    {[
                      { key: 'note',   label: 'Note' },
                      { key: 'number', label: 'Fret' },
                    ].map(({ key, label }) => (
                      <button key={key} onClick={() => setDisplayMode(key)}
                        className="px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all duration-200"
                        style={displayMode === key ? {
                          background: 'linear-gradient(135deg, var(--primary-soft), var(--accent))',
                          color: 'var(--bg)', border: '1px solid transparent',
                          letterSpacing: '0.18em', boxShadow: '0 8px 22px rgba(0,0,0,0.28)', transform: 'translateY(-1px)',
                        } : {
                          background: 'var(--panel-1)', color: 'var(--muted)',
                          border: '1px solid var(--border)', letterSpacing: '0.14em', boxShadow: 'none',
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {/* Subdivision selector — controls how many notes spawn per beat */}
                  <div className="d-flex flex-wrap gap-2 justify-content-center mt-2">
                    {[
                      { key: 1, label: '♩ Quarter' },
                      { key: 2, label: '♪ Eighth'  },
                      { key: 4, label: '⚡ Boss'    },
                    ].map(({ key, label }) => (
                      <button key={key} onClick={() => setSubdivision(key)}
                        className="px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all duration-200"
                        title={key === 4 ? 'Sixteenth notes — boss difficulty' : undefined}
                        style={subdivision === key ? {
                          background: key === 4
                            ? 'linear-gradient(135deg, #ff4d4d, #ff9900)'
                            : 'linear-gradient(135deg, var(--accent), var(--primary-soft))',
                          color: 'var(--bg)', border: '1px solid transparent',
                          letterSpacing: '0.14em', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', transform: 'translateY(-1px)',
                        } : {
                          background: 'var(--panel-1)', color: 'var(--muted)',
                          border: '1px solid var(--border)', letterSpacing: '0.12em', boxShadow: 'none',
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <Row className="justify-content-center justify-content-lg-end g-3">
                  <Col xs="auto">
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--muted)' }}>Score</p>
                      <p className="text-4xl font-mono font-black" style={{ color: 'var(--primary-soft)' }}>{score}</p>
                      {hitFeedback && (
                        <p className="text-[11px] font-black uppercase tracking-widest" style={{
                          color: hitFeedback === 'Perfect!' ? '#06D6A0' : 'var(--accent)',
                          animation: 'fadeInUp 0.15s ease',
                        }}>{hitFeedback}</p>
                      )}
                    </div>
                  </Col>
                  <Col xs="auto">
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--muted)' }}>Target</p>
                      <p className="text-4xl font-mono font-black" style={{ color: 'var(--text)' }}>{currentNote}</p>
                    </div>
                  </Col>
                </Row>
              </Col>
            </Row>

            {/* Sliders row */}
            <Row className="justify-content-center mt-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <Col xl={3} lg={4} md={6} sm={10} xs={12} className="mb-3 d-flex justify-content-center">
                <div className="d-flex align-items-center gap-3 w-100" style={{ maxWidth: '320px' }}>
                  <span className="text-[9px] uppercase tracking-widest text-center" style={{ color: 'var(--muted)', minWidth: '28px' }}>Fret</span>
                  <input type="range" min="0" max="12" step="1" value={maxFret}
                    onChange={e => { const v = Number(e.target.value); setMaxFret(v); maxFretRef.current = v; }}
                    className="h-1 rounded-full appearance-none cursor-pointer flex-grow-1"
                    style={{ accentColor: 'var(--primary)', background: `linear-gradient(to right, var(--primary) ${(maxFret/12)*100}%, var(--panel-2) ${(maxFret/12)*100}%)` }}
                  />
                  <span className="text-[9px] font-mono font-bold" style={{ color: 'var(--accent)', minWidth: '48px' }}>
                    {maxFret === 0 ? 'open' : `0-${maxFret}`}
                  </span>
                </div>
              </Col>
              <Col xl={3} lg={4} md={6} sm={10} xs={12} className="mb-3 d-flex justify-content-center">
                <div className="d-flex align-items-center gap-3 w-100" style={{ maxWidth: '320px' }}>
                  <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--muted)', minWidth: '32px' }}>Mic Gain</span>
                  <input type="range" min="1" max="20" step="0.5" value={gainLevel}
                    onChange={e => handleGameGainChange(Number(e.target.value))}
                    className="h-1 rounded-full appearance-none cursor-pointer flex-grow-1"
                    style={{ accentColor: 'var(--primary)', background: `linear-gradient(to right, var(--primary) ${(gainLevel/20)*100}%, var(--panel-2) ${(gainLevel/20)*100}%)` }}
                  />
                  <span className="text-[9px] font-mono font-bold" style={{ color: 'var(--accent)', minWidth: '28px' }}>{gainLevel}x</span>
                </div>
              </Col>
              <Col xl={3} lg={4} md={6} sm={10} xs={12} className="mb-3 d-flex justify-content-center">
                <div className="d-flex align-items-center gap-3 w-100" style={{ maxWidth: '320px' }}>
                  <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--muted)', minWidth: '24px' }}>Vol</span>
                  <input type="range" min="1" max="20" step="0.5" value={noteVolume}
                    onChange={e => { const v = Number(e.target.value); setNoteVolume(v); noteVolumeRef.current = v; }}
                    className="h-1 rounded-full appearance-none cursor-pointer flex-grow-1"
                    style={{ accentColor: 'var(--accent)', background: `linear-gradient(to right, var(--accent) ${(noteVolume/20)*100}%, var(--panel-2) ${(noteVolume/20)*100}%)` }}
                  />
                  <span className="text-[9px] font-mono font-bold" style={{ color: 'var(--accent)', minWidth: '28px' }}>{noteVolume}x</span>
                </div>
              </Col>
            </Row>

            {/* Metronome — BPM slider drives scroll speed */}
            <Row className="mt-1 pb-2">
              <Col>
                <MetronomeBar
                  bpm={metronome.bpm}
                  isPlaying={metronome.isPlaying}
                  currentBeat={metronome.currentBeat}
                  soundProfile={metronome.soundProfile}
                  setSoundProfile={metronome.setSoundProfile}
                  onToggle={() => metronome.isPlaying ? metronome.stop() : metronome.start(audioContextRef.current)}
                  onBpmChange={metronome.setBpm}
                  waveformRef={gameCanvasRef}
                />
              </Col>
            </Row>
          </div>

          {/* Game canvas */}
          <div style={{ maxWidth: '100%', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <div ref={el => { gameContainerRef.current = el; gameCanvasRef.current = el; }} style={{ maxWidth: '800px', width: '100%', lineHeight: 0 }} className="rounded-[2.5rem] border-[12px] border-[#111] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden game-canvas-wrapper" />
          </div>

          {/* Live detected positions */}
          <div className="card mt-3 flex flex-col items-center justify-center gap-2 min-h-[48px] text-center" style={{ padding: '12px 20px' }}>
            <p className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Detecting</p>
            {livePositions.length > 0 ? (
              <div className="flex flex-wrap justify-center items-center gap-2">
                {livePositions.map((pos, i) => (
                  <React.Fragment key={`${pos.noteLabel}-${pos.stringNum}-${pos.fret}`}>
                    {i > 0 && <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}> | </span>}
                    <span className="font-mono font-black" style={{ color: 'var(--accent)' }}>{pos.noteLabel} </span>
                    <span className="text-[10px]" style={{ color: 'var(--muted)' }}>str {pos.stringNum} · {pos.fret === 0 ? 'open' : `fret ${pos.fret}`}</span>
                  </React.Fragment>
                ))}
                {liveHz > 0 && <span className="text-[9px] font-mono ml-2" style={{ color: 'var(--muted)', opacity: 0.6 }}>{liveHz} Hz</span>}
              </div>
            ) : liveHz === -1 ? (
              <span className="text-[10px] font-mono animate-pulse" style={{ color: 'var(--muted)' }}>calibrating noise floor…</span>
            ) : (
              <span className="text-[10px] font-mono" style={{ color: 'var(--muted)', opacity: 0.5 }}>—  pluck a string</span>
            )}
          </div>

          <style>{`
            .game-canvas-wrapper canvas {
              width: 100% !important;
              height: auto !important;
              display: block;
            }
          `}</style>
        </Col>
      </Row>
    </Container>
  );
};

export default MusicalGame;
