import React, { useEffect, useMemo, useRef, useState } from 'react';
import Soundfont from 'soundfont-player';
import { Container } from 'react-bootstrap';
import { useSelector } from 'react-redux';

import { createSongTimeline, validateSongPayload } from './MusicEngine/SongManager';
import { NOTE_POOL } from './MusicEngine/constants/guitar';
import { correctOctave, getAllNotePositions } from './MusicEngine/utils/pitchDetection';
import { getFFTPeaks, detectChord } from './MusicEngine/utils/chordDetection';
import { makeDetectors } from './MusicEngine/utils/audioDetectors';
import { stringFretToSamplerNote, getChordSamplerNotes } from './MusicEngine/utils/samplerUtils';
import useMetronome from '../hooks/useMetronome';
import AudioCheck from './MusicEngine/components/AudioCheck';
import MetronomeBar from './MusicEngine/components/MetronomeBar';
import ChordDiagramCanvas from './MusicEngine/components/ChordDiagramCanvas';

/**
 * SongTimelinePlayer
 * Mounts a PixiJS SongManager timeline for a given song payload.
 *
 * Props:
 *   songPayload   { bpm, timeline, arrangement_title, is_verified, is_ai_composed, song_title }
 *   autoStart     boolean (kept for compatibility; playback is still manual)
 *   onReady       (controls) => void – called with { start, pause, destroy } once ready
 *   onSessionComplete ({ score, accuracy, avg_completion_time }) => void
 *   onFinishSession () => void – called when user clicks Finish in performance mode to exit
 *   practiceContext { stepId, category, route_to, title, ... } – context for looking up previous attempts
 */
export default function SongTimelinePlayer({
  songPayload,
  autoStart = false,
  onReady,
  onSessionComplete,
  onFinishSession,
  practiceContext,
}) {
  const exercises = useSelector((state) => state.aiPlan.exercises) || [];
  const plan = useSelector((state) => state.aiPlan.plan) || {};
  const mountRef = useRef(null);
  const ctrlRef = useRef(null);
  const inputAudioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micGainNodeRef = useRef(null); // Microphone input gain node
  const playbackContextRef = useRef(null);
  const samplerRef = useRef(null);
  const audioTickRef = useRef(null);
  const micTickRef = useRef(null);
  const livePitchRef = useRef(0);
  const livePositionsRef = useRef([]);
  const liveChordRef = useRef(null);
  const liveChordScoreRef = useRef(0);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [errMsg, setErrMsg] = useState('');
  const [screen, setScreen] = useState('check'); // check | start | playing
  const [gainLevel, setGainLevel] = useState(4);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const [activeMode, setActiveMode] = useState(null); // null | 'practice' | 'perform'
  const [practiceSpeed, setPracticeSpeed] = useState(0.5); // fraction of original BPM
  const [displayMode, setDisplayMode] = useState('note'); // 'note' | 'fret'
  const [metronomeEnabled, setMetronomeEnabled] = useState(true);
  const [countdown, setCountdown] = useState(null); // null | 5 | 4 | 3 | 2 | 1
  const [score, setScore] = useState(0);
  const [sessionResult, setSessionResult] = useState(null);
  const [micGainMultiplier, setMicGainMultiplier] = useState(1.0); // scale mic sensitivity 0.5x to 2.0x
  const [diagramQueue, setDiagramQueue] = useState([]);
  const [fadingIds, setFadingIds] = useState(new Set());
  const [liveDetectionInfo, setLiveDetectionInfo] = useState({ pitch: 0, positions: [], chord: null, rms: 0, gated: false, peaks: [] });
  const countdownTimersRef = useRef([]);
  const diagramIdRef = useRef(0);
  const hasStartedRunRef = useRef(false);
  const runStartedAtRef = useRef(null);
  const completionSentRef = useRef(false);
  const HIT_GATE_LEFT = 88;
  const HIT_GATE_RIGHT = 180;

  // Helper: clear any pending countdown timers
  const clearCountdownTimers = () => {
    countdownTimersRef.current.forEach((id) => clearTimeout(id));
    countdownTimersRef.current = [];
    setCountdown(null);
  };

  const stopMicGrading = () => {
    if (micTickRef.current) cancelAnimationFrame(micTickRef.current);
    micTickRef.current = null;
    analyserRef.current = null;
    livePitchRef.current = 0;
    livePositionsRef.current = [];
    liveChordRef.current = null;
    liveChordScoreRef.current = 0;
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
    }
    inputAudioContextRef.current = null;
  };

  const resetRunState = () => {
    setScore(0);
    setSessionResult(null);
    setDiagramQueue([]);
    setFadingIds(new Set());
    diagramIdRef.current = 0;
    hasStartedRunRef.current = false;
    livePitchRef.current = 0;
    livePositionsRef.current = [];
    liveChordRef.current = null;
    liveChordScoreRef.current = 0;
    completionSentRef.current = false;
    runStartedAtRef.current = null;
  };

  const queueChordDiagram = (chordName) => {
    const id = ++diagramIdRef.current;
    setDiagramQueue((prev) => [...prev, { id, chordName }].slice(-3));
  };

  const fadeOutChordDiagram = (id) => {
    setFadingIds((prev) => new Set([...prev, id]));
    setTimeout(() => {
      setDiagramQueue((prev) => prev.filter((entry) => entry.id !== id));
      setFadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 400);
  };

  // Helper: visual 5→1 countdown using setTimeout chain
  const startCountdown = () => {
    clearCountdownTimers();
    setCountdown(5);
    const ids = [
      setTimeout(() => setCountdown(4), 1000),
      setTimeout(() => setCountdown(3), 2000),
      setTimeout(() => setCountdown(2), 3000),
      setTimeout(() => setCountdown(1), 4000),
      setTimeout(() => setCountdown(null), 5000),
    ];
    countdownTimersRef.current = ids;
  };

  const metronome = useMetronome(songPayload?.bpm || 80);

  // In practice mode, scale the BPM so the timeline and metronome run slower
  const effectivePayload = useMemo(() => {
    if (!songPayload || activeMode !== 'practice') return songPayload;
    const scaledBpm = Math.max(20, Math.round(songPayload.bpm * practiceSpeed));
    return { ...songPayload, bpm: scaledBpm };
  }, [songPayload, activeMode, practiceSpeed]);

  const stopTimeline = () => {
    ctrlRef.current?.pause();
    ctrlRef.current?.destroy();
    ctrlRef.current = null;
    setIsTimelinePlaying(false);
  };

  // Always keep metronome BPM locked to the effective song BPM
  useEffect(() => {
    const bpm = effectivePayload?.bpm || songPayload?.bpm || 80;
    metronome.setBpm(bpm);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectivePayload?.bpm]);

  // ── Playback handlers ────────────────────────────────────────────────────────
  // Compute the negative starting beat so the first note hits exactly
  // HEAD_UP_SECS seconds after Play is pressed.
  const HEAD_UP_SECS = 5;
  const getFromBeat = (payload) => {
    const bpm       = payload?.bpm || 80;
    const firstBeat = payload?.timeline?.[0]?.beat ?? 1;
    return firstBeat - HEAD_UP_SECS * (bpm / 60);
  };

  const handlePlay = async () => {
    const { ctx } = await ensurePlaybackReady();
    const effectiveBpm = effectivePayload?.bpm || songPayload?.bpm || 80;
    metronome.setBpm(effectiveBpm); // force BPM sync before start

    if (!hasStartedRunRef.current) {
      resetRunState();
      ctrlRef.current?.start(getFromBeat(effectivePayload));
      hasStartedRunRef.current = true;
      runStartedAtRef.current = performance.now();
      startCountdown();
    } else {
      ctrlRef.current?.start(ctrlRef.current?.clock?.getCurrentBeat?.());
    }

    setIsTimelinePlaying(true);
    if (metronomeEnabled) metronome.start(ctx);
  };

  const handlePause = () => {
    ctrlRef.current?.pause();
    setIsTimelinePlaying(false);
    metronome.stop();
    clearCountdownTimers();
  };

  const handleRestart = async () => {
    const c = ctrlRef.current;
    if (!c) return;
    clearCountdownTimers();
    metronome.stop();
    resetRunState();
    c.pause();
    c.clock.reset();
    c.manager.destroy();
    const effectiveBpm = effectivePayload?.bpm || songPayload?.bpm || 80;
    metronome.setBpm(effectiveBpm); // force BPM sync
    c.start(getFromBeat(effectivePayload));
    hasStartedRunRef.current = true;
    runStartedAtRef.current = performance.now();
    setIsTimelinePlaying(true);
    if (metronomeEnabled) {
      const { ctx } = await ensurePlaybackReady();
      metronome.start(ctx);
    }
    startCountdown();
  };

  const handleMenu = () => {
    clearCountdownTimers();
    metronome.stop();
    stopTimeline();
    resetRunState();
    setActiveMode(null);
    setScreen('start');
  };

  const handleFinish = () => {
    // In performance mode, finalize the session and call parent to navigate back
    clearCountdownTimers();
    metronome.stop();
    stopTimeline();
    resetRunState();
    setActiveMode(null);
    setScreen('start');
    onFinishSession?.();
  };

  const handleMetronomeToggle = async () => {
    if (metronomeEnabled) {
      setMetronomeEnabled(false);
      metronome.stop();
    } else {
      setMetronomeEnabled(true);
      if (isTimelinePlaying) {
        const { ctx } = await ensurePlaybackReady();
        metronome.start(ctx);
      }
    }
  };

  // When practice speed changes mid-play: rebuild timeline at new speed, reset play state
  const handlePracticeSpeedChange = (s) => {
    clearCountdownTimers();
    metronome.stop();
    setIsTimelinePlaying(false);
    resetRunState();
    setPracticeSpeed(s);
  };

  // Initialize/destroy timeline only on "playing" screen.
  useEffect(() => {
    if (screen !== 'playing') {
      stopTimeline();
      return;
    }
    if (!mountRef.current || !effectivePayload) return;

    const validation = validateSongPayload(effectivePayload);
    if (!validation.valid) {
      setErrMsg(validation.errors.join('\n'));
      setStatus('error');
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setErrMsg('');

    (async () => {
      try {
        const controls = await createSongTimeline(mountRef.current, effectivePayload, { 
          displayMode,
          hitGateLeft: 88,
          hitGateRight: 180,
        });
        if (cancelled) {
          controls.destroy();
          return;
        }
        ctrlRef.current = controls;
        setStatus('ready');
        onReady?.(controls);
        if (autoStart) {
          // Kept for compatibility, but still explicit in UI by default.
          controls.start();
          setIsTimelinePlaying(true);
        }
      } catch (err) {
        if (!cancelled) {
          setErrMsg(err.message || 'Failed to initialise the song timeline.');
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      stopTimeline();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, effectivePayload]);

  const ensurePlaybackReady = async () => {
    if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
      playbackContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (playbackContextRef.current.state === 'suspended') {
      await playbackContextRef.current.resume();
    }
    if (!samplerRef.current) {
      samplerRef.current = await Soundfont.instrument(playbackContextRef.current, 'acoustic_guitar_steel');
    }
    return { ctx: playbackContextRef.current, sampler: samplerRef.current };
  };

  // Microphone grading loop: mirrors the MusicEngine note/chord detectors so
  // score is based on what the player actually performs, not pills simply
  // reaching the hit zone.
  useEffect(() => {
    if (screen !== 'playing' || status !== 'ready') {
      stopMicGrading();
      return;
    }

    let cancelled = false;

    const startMicGrading = async () => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') await audioContext.resume();

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            highpassFilter: false,
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          audioContext.close();
          return;
        }

        inputAudioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = gainLevel; // Apply mic gain from state
        micGainNodeRef.current = gainNode; // Store for updates when gainLevel changes
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 4096; // Match AudioCheck for consistent detection
        source.connect(gainNode);
        gainNode.connect(analyser);
        analyserRef.current = analyser;

        const detect = makeDetectors(audioContext.sampleRate);
        const buffer = new Float32Array(analyser.fftSize);
        let drawFrame = 0;
        let lastValidPitch = 0;
        let lastValidPositions = [];
        let lastValidTime = 0;
        let lastValidChord = null;
        let lastValidChordTime = 0;

        const METRO_GATE_MS = 120;
        const PITCH_HOLD_MS = 150;
        const CHORD_HOLD_MS = 600;
        const RMS_THRESHOLD = 0.015;

        const loop = () => {
          if (cancelled || !analyserRef.current || !inputAudioContextRef.current) return;

          drawFrame++;
          analyser.getFloatTimeDomainData(buffer);

          let rms = 0;
          for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i];
          rms = Math.sqrt(rms / buffer.length);

          const gated = metronome.isPlaying &&
            (performance.now() - metronome.lastTickRef.current) < METRO_GATE_MS;
          const raw = detect(buffer);
          const detected = gated ? null : correctOctave(raw);
          const now = performance.now();

          if (detected && detected > 70 && detected < 1400) {
            lastValidPitch = detected;
            lastValidPositions = getAllNotePositions(detected);
            lastValidTime = now;
            livePitchRef.current = detected;
            livePositionsRef.current = lastValidPositions;
          } else if (now - lastValidTime < PITCH_HOLD_MS && lastValidPitch) {
            livePitchRef.current = lastValidPitch;
            livePositionsRef.current = lastValidPositions;
          } else {
            livePitchRef.current = 0;
            livePositionsRef.current = [];
          }

          // Update detection info display
          if (drawFrame % 4 === 0) {
            setLiveDetectionInfo({
              pitch: livePitchRef.current,
              positions: livePositionsRef.current,
              chord: liveChordRef.current,
              rms: rms,
              gated: gated,
              peaks: [],
            });
          }

          // Chord detection — only run every 8th frame, when signal is strong, and not gated
          if (!gated && drawFrame % 8 === 0 && rms > RMS_THRESHOLD) {
            const peaks = getFFTPeaks(analyser, audioContext.sampleRate);
            const chord = detectChord(peaks);
            if (chord && chord.score >= 2.0) {
              lastValidChord = `${chord.root}${chord.suffix}`;
              lastValidChordTime = now;
              liveChordScoreRef.current = chord.score;
            }
          }

          if (lastValidChord && now - lastValidChordTime < CHORD_HOLD_MS && rms > RMS_THRESHOLD) {
            liveChordRef.current = lastValidChord;
          } else if (rms <= RMS_THRESHOLD || now - lastValidChordTime >= CHORD_HOLD_MS) {
            lastValidChord = null;
            liveChordRef.current = null;
            liveChordScoreRef.current = 0;
          }

          micTickRef.current = requestAnimationFrame(loop);
        };

        micTickRef.current = requestAnimationFrame(loop);
      } catch (_err) {
        // mic grading initialization failed
      }
    };

    // Only start mic grading when the game is actively playing (not on check/start screens)
    if (screen === 'playing') {
      startMicGrading();
    }

    return () => {
      cancelled = true;
      stopMicGrading();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, status, micGainMultiplier]);

  // Update microphone gain node when gainLevel changes
  useEffect(() => {
    if (micGainNodeRef.current) {
      micGainNodeRef.current.gain.value = gainLevel;
    }
  }, [gainLevel]);

  const playPillAudio = async (pill) => {
    if (!pill || pill._audioPlayed || pill._audioQueued) return;
    pill._audioQueued = true;
    const { ctx, sampler } = await ensurePlaybackReady();
    const event = pill.event || {};

    if (event.type === 'note') {
      const matches = NOTE_POOL
        .filter((e) => e.noteLabel === event.value)
        .sort((a, b) => a.fret - b.fret);
      if (!matches.length) {
        pill._audioQueued = false;
        return;
      }
      const entry = matches[0];
      const noteLabel = stringFretToSamplerNote(entry.string, entry.fret);
      sampler.play(noteLabel, ctx.currentTime, { duration: 1.5, gain: gainLevel });
      pill._audioPlayed = true;
      pill._audioQueued = false;
      return;
    }

    if (event.type === 'chord') {
      const chordName = Array.isArray(event.value) ? event.value[0] : event.value;
      const labels = getChordSamplerNotes(chordName);
      labels.forEach((label) => {
        sampler.play(label, ctx.currentTime, { duration: 2.0, gain: gainLevel });
      });
      pill._audioPlayed = true;
      pill._audioQueued = false;
      return;
    }

    pill._audioQueued = false;
  };

  const markPillHit = (pill) => {
    if (!pill || pill._graded) return;
    pill._graded = true;
    pill.container.alpha = 0.48;

    const isPerfect = (performance.now() - metronome.lastTickRef.current) < 80;
    setScore((prev) => prev + (isPerfect ? 20 : 10));

    if (activeMode === 'practice' && pill.event?.type === 'chord' && pill._diagramId) {
      fadeOutChordDiagram(pill._diagramId);
    }
  };

  // Audio cue loop: when pills enter the hit zone, play their sample once.
  useEffect(() => {
    if (screen !== 'playing' || status !== 'ready') return;

    const loop = () => {
      const controls = ctrlRef.current;
      if (controls?.manager?.activePills) {
        controls.manager.activePills.forEach((pill) => {
          const x = pill.container?.x;
          if (activeMode === 'practice' && pill.event?.type === 'chord' && !pill._diagramSpawned) {
            pill._diagramSpawned = true;
            const chordName = Array.isArray(pill.event.value) ? pill.event.value[0] : pill.event.value;
            queueChordDiagram(chordName);
            pill._diagramId = diagramIdRef.current;
          }

          if (typeof x === 'number' && x > HIT_GATE_LEFT && x < HIT_GATE_RIGHT) {
            if (!pill._audioPlayed && !pill._audioQueued) {
              playPillAudio(pill).catch(() => {});
            }

            if (!pill._graded && pill.event?.type === 'note') {
              const matches = NOTE_POOL
                .filter((entry) => entry.noteLabel === pill.event.value)
                .sort((a, b) => a.fret - b.fret);
              const entry = matches[0];
              const pitch = livePitchRef.current;
              const matchedPitch = !!entry && (
                livePositionsRef.current.some((pos) => pos.noteLabel === entry.noteLabel) ||
                (pitch > 0 && Math.abs(1200 * Math.log2(pitch / entry.hz)) < 100)
              );
              if (matchedPitch) markPillHit(pill);
            }

            if (!pill._graded && pill.event?.type === 'chord') {
              const chordName = Array.isArray(pill.event.value) ? pill.event.value[0] : pill.event.value;
              const matchedChord = liveChordRef.current === chordName && liveChordScoreRef.current >= 2.5;
              if (matchedChord) {
                markPillHit(pill);
              }
            }
          }

          if (activeMode === 'practice' && pill.event?.type === 'chord' && pill._diagramId && !pill._diagramRemoved && typeof x === 'number' && x < -40) {
            pill._diagramRemoved = true;
            fadeOutChordDiagram(pill._diagramId);
          }
        });

        const timeline = effectivePayload?.timeline || [];
        const maxBeat = timeline.reduce((mx, ev) => Math.max(mx, (ev.beat || 0) + (ev.duration || 0)), 0);
        const currentBeat = controls?.clock?.getCurrentBeat?.() || 0;
        const finished =
          hasStartedRunRef.current &&
          isTimelinePlaying &&
          timeline.length > 0 &&
          currentBeat > maxBeat + 0.5 &&
          controls.manager.activePills.length === 0;

        if (finished && !completionSentRef.current) {
          completionSentRef.current = true;
          const totalEvents = timeline.length || 1;
          const maxScore = totalEvents * 20;
          const accuracy = Math.max(0, Math.min(100, Math.round((score / maxScore) * 100)));
          const avgCompletionTime = runStartedAtRef.current
            ? Math.round((performance.now() - runStartedAtRef.current) / 1000)
            : null;
          ctrlRef.current?.pause();
          setIsTimelinePlaying(false);
          metronome.stop();
          clearCountdownTimers();
          setSessionResult({ score, accuracy, avg_completion_time: avgCompletionTime });
          onSessionComplete?.({
            score,
            accuracy,
            avg_completion_time: avgCompletionTime,
          });
        }
      }
      audioTickRef.current = requestAnimationFrame(loop);
    };

    audioTickRef.current = requestAnimationFrame(loop);
    return () => {
      if (audioTickRef.current) cancelAnimationFrame(audioTickRef.current);
      audioTickRef.current = null;
    };
  }, [screen, status, gainLevel, activeMode, effectivePayload, isTimelinePlaying, onSessionComplete, score]); // eslint-disable-line react-hooks/exhaustive-deps -- metronome, playPillAudio, markPillHit are stable refs/functions

  useEffect(() => () => {
    clearCountdownTimers();
    stopMicGrading();
    stopTimeline();
    metronome.stop();
    if (audioTickRef.current) cancelAnimationFrame(audioTickRef.current);
    if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') {
      playbackContextRef.current.close();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { arrangement_title, is_ai_composed, song_title } = songPayload || {};

  if (screen === 'check') {
    return (
      <AudioCheck
        onPass={(g) => {
          setGainLevel(g);
          setScreen('start');
        }}
      />
    );
  }

  if (screen === 'start') {
    const originalBpm = songPayload?.bpm || 80;
    const previewBpm = Math.max(20, Math.round(originalBpm * practiceSpeed));

    return (
      <Container fluid className="min-h-screen d-flex align-items-center justify-content-center" style={{ padding: '2rem 1rem' }}>
        <div style={{ width: '100%', maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h1 className="text-5xl font-black mb-3 italic tracking-tighter" style={{ color: 'var(--primary-soft)' }}>
            SONG MODE
          </h1>
          <p className="mb-5 uppercase tracking-[0.28em] text-xs font-bold" style={{ color: 'var(--muted)' }}>
            Choose how you want to play
          </p>

          {/* Mode Cards */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>

            {/* Practice Mode Card */}
            <div
              onClick={() => setActiveMode('practice')}
              style={{
                flex: '1 1 260px', maxWidth: 300, cursor: 'pointer',
                background: activeMode === 'practice'
                  ? 'rgba(129,92,249,0.22)'
                  : 'rgba(255,255,255,0.04)',
                border: activeMode === 'practice'
                  ? '2px solid var(--primary-soft)'
                  : '2px solid rgba(255,255,255,0.1)',
                borderRadius: 16, padding: '1.75rem 1.25rem',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🎯</div>
              <h3 style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: 6 }}>Practice Mode</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: activeMode === 'practice' ? 16 : 0 }}>
                Slow it down and build accuracy
              </p>

              {/* Speed presets — visible only when practice card is selected */}
              {activeMode === 'practice' && (
                <div onClick={(e) => e.stopPropagation()}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8 }}>
                    Speed: <strong style={{ color: 'var(--primary-soft)' }}>{Math.round(practiceSpeed * 100)}%</strong>
                    {' '}({previewBpm} BPM)
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {[0.25, 0.5, 0.75, 1.0].map((s) => (
                      <button
                        key={s}
                        className={`btn ${practiceSpeed === s ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 999 }}
                        onClick={() => setPracticeSpeed(s)}
                      >
                        {Math.round(s * 100)}%
                      </button>
                    ))}
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: 16, padding: '12px 28px', borderRadius: 999, fontWeight: 800 }}
                    onClick={() => setScreen('playing')}
                  >
                    ▶ Begin Practice
                  </button>
                </div>
              )}
            </div>

            {/* Perform Mode Card */}
            <div
              onClick={() => { setActiveMode('perform'); setScreen('playing'); }}
              style={{
                flex: '1 1 260px', maxWidth: 300, cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)',
                border: '2px solid rgba(255,255,255,0.1)',
                borderRadius: 16, padding: '1.75rem 1.25rem',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🎸</div>
              <h3 style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: 6 }}>Perform Mode</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 6 }}>
                Full tempo — the real thing
              </p>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{originalBpm} BPM</div>
            </div>
          </div>

          <button
            onClick={() => setScreen('check')}
            className="btn btn-outline font-black"
            style={{ padding: '10px 24px', borderRadius: '999px', fontSize: '0.85rem' }}
          >
            Re-run Audio Check
          </button>

          {/* Display mode toggle */}
          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '10px' }}>
              Points Label Mode
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={() => setDisplayMode('note')}
                className={`btn ${displayMode === 'note' ? 'btn-primary' : 'btn-outline'}`}
                style={{ borderRadius: 999, padding: '8px 20px', fontSize: '0.85rem', fontWeight: 700 }}
              >
                Note Names
              </button>
              <button
                onClick={() => setDisplayMode('fret')}
                className={`btn ${displayMode === 'fret' ? 'btn-primary' : 'btn-outline'}`}
                style={{ borderRadius: 999, padding: '8px 20px', fontSize: '0.85rem', fontWeight: 700 }}
              >
                Fret Numbers
              </button>
            </div>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* ── Song header ────────────────────────────────────────────────────── */}
      {arrangement_title && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          marginBottom: '12px', flexWrap: 'wrap',
        }}>
          <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--accent, #9D4EDD)', fontWeight: 700 }}>
            | {arrangement_title} |
          </span>

          {/* Mode badge */}
          {activeMode === 'practice' && (
            <span style={{
              backgroundColor: 'rgba(129,92,249,0.18)', color: 'var(--primary-soft)',
              border: '1px solid rgba(129,92,249,0.4)', borderRadius: '20px',
              padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600,
            }}>
              Practice {Math.round(practiceSpeed * 100)}%
            </span>
          )}
          {activeMode === 'perform' && (
            <span style={{
              backgroundColor: 'rgba(6,214,160,0.12)', color: '#06D6A0',
              border: '1px solid rgba(6,214,160,0.4)', borderRadius: '20px',
              padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600,
            }}>
              Perform Mode
            </span>
          )}

          {/* Display mode badge */}
          <span style={{
            backgroundColor: 'rgba(255,255,255,0.07)', color: 'var(--muted)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px',
            padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600,
          }}>
            {displayMode === 'fret' ? 'Fret Mode' : 'Note Mode'}
          </span>

          <span style={{
            backgroundColor: 'rgba(255,255,255,0.07)', color: 'var(--text)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px',
            padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700,
          }}>
            Score {score}/{(effectivePayload?.timeline?.length || 0) * 20}
          </span>

          {/* Hallucination safety-net badge */}
          {is_ai_composed ? (
            <span style={{
              backgroundColor: 'rgba(255,193,7,0.15)', color: '#FFC107',
              border: '1px solid rgba(255,193,7,0.4)', borderRadius: '20px',
              padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600,
            }}>
              🤖 AI Composition
            </span>
          ) : (
            <span style={{
              backgroundColor: 'rgba(6,214,160,0.12)', color: '#06D6A0',
              border: '1px solid rgba(6,214,160,0.4)', borderRadius: '20px',
              padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600,
            }}>
              Community Verified
            </span>
          )}
        </div>
      )}

      {/* Composer disclaimer */}
      {is_ai_composed && (
        <p style={{
          fontSize: '0.8rem', color: 'rgba(200,200,220,0.7)',
          marginBottom: '12px', fontStyle: 'italic',
        }}>
          The AI is composing a custom arrangement of "{song_title}" for you — creative choices are intentional!
        </p>
      )}

      <div style={{ marginBottom: '12px' }}>
        <MetronomeBar
          bpm={metronome.bpm}
          isPlaying={metronome.isPlaying}
          currentBeat={metronome.currentBeat}
          soundProfile={metronome.soundProfile}
          setSoundProfile={metronome.setSoundProfile}
          onToggle={handleMetronomeToggle}
          onBpmChange={() => {}} // BPM is locked to song
          hideBpmRow
          isEnabled={metronomeEnabled}
        />
      </div>

      {/* ── Loading / Error states ─────────────────────────────────────────── */}
      {status === 'loading' && (
        <div style={{
          height: '420px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#5B21B6', borderRadius: '12px',
          color: '#d0b8ff', fontFamily: 'monospace', flexDirection: 'column', gap: '12px',
        }}>
          <div style={{ fontSize: '2rem' }}>🎵</div>
          <div>Preparing the stage…</div>
        </div>
      )}

      {status === 'error' && (
        <div style={{
          height: '420px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#1a0030', borderRadius: '12px',
          color: '#FF6584', fontFamily: 'monospace', flexDirection: 'column',
          gap: '12px', padding: '24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <div>Failed to load song timeline</div>
          <pre style={{ fontSize: '0.75rem', color: 'rgba(255,101,132,0.7)', whiteSpace: 'pre-wrap' }}>
            {errMsg}
          </pre>
        </div>
      )}

      {/* ── PixiJS canvas mount + countdown overlay ───────────────────────── */}
      <div style={{ position: 'relative', display: status === 'error' ? 'none' : 'block', width: '100%' }}>
        <div
          ref={mountRef}
          style={{ borderRadius: '12px', overflow: 'hidden', width: '100%' }}
        />
        {/* Countdown shown during the 5-second head-up window */}
        {countdown !== null && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', zIndex: 10,
          }}>
            <div style={{
              fontSize: '7rem', fontWeight: 900, fontFamily: 'monospace',
              color: '#fff',
              textShadow: '0 0 30px #9D4EDD, 0 0 60px #9D4EDD88',
              lineHeight: 1,
              animation: 'countdownPop 0.15s ease-out',
            }}>
              {countdown}
            </div>
          </div>
        )}
      </div>

      {/* ── Playback controls (shown once ready) ─────────────────────────── */}
      {status === 'ready' && (
        <div style={{
          display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'center',
        }}>
          <button className="btn btn-primary" onClick={handlePlay}>▶ Play</button>
          <button className="btn btn-outline" onClick={handlePause}>⏸ Pause</button>
          <button className="btn btn-outline" onClick={handleRestart}>↩ Restart</button>
          <button className="btn btn-outline" onClick={handleMenu}>← Menu</button>
        </div>
      )}

      {/* ── Mic gain scaler (both modes) ────────────────────────────────── */}
      {status === 'ready' && (
        <div style={{
          marginTop: '12px', padding: '10px 16px',
          background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap',
        }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--muted)', minWidth: 'max-content' }}>
            🎤 Mic Sensitivity
          </span>
          <input
            type="range"
            min="1"
            max="20"
            step="0.5"
            value={micGainMultiplier}
            onChange={(e) => setMicGainMultiplier(parseFloat(e.target.value))}
            style={{
              flex: 1, minWidth: '120px', height: '6px',
              borderRadius: '3px', background: 'rgba(255,255,255,0.1)',
              outline: 'none', cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: '0.78rem', minWidth: '30px', textAlign: 'right', color: 'var(--accent)' }}>
            {micGainMultiplier.toFixed(1)}x
          </span>
        </div>
      )}

      {/* ── Practice speed presets (inline, no menu trip needed) ────────── */}
      {status === 'ready' && activeMode === 'practice' && (
        <>
          <div style={{
            marginTop: '12px', padding: '10px 16px',
            background: 'rgba(129,92,249,0.08)', borderRadius: '12px',
            border: '1px solid rgba(129,92,249,0.2)',
            display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--muted)' }}>
              🎯 Speed
            </span>
            {[0.25, 0.5, 0.75, 1.0].map((s) => (
              <button
                key={s}
                className={`btn ${practiceSpeed === s ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '5px 14px', fontSize: '0.78rem', borderRadius: 999 }}
                onClick={() => handlePracticeSpeedChange(s)}
              >
                {Math.round(s * 100)}%{' '}
                <span style={{ opacity: 0.65, fontSize: '0.7rem' }}>
                  ({Math.max(20, Math.round((songPayload?.bpm || 80) * s))} BPM)
                </span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '24px', marginTop: '16px', alignItems: 'flex-start', justifyContent: 'center' }}>
            {diagramQueue.length === 0 ? (
              <p style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--muted)', opacity: 0.5 }}>
                Diagrams appear when chords spawn
              </p>
            ) : (
              diagramQueue.slice(-3).map((entry, i, arr) => (
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
                  <p style={{ fontSize: '0.78rem', fontWeight: 900, fontFamily: 'monospace', marginBottom: 8, letterSpacing: '0.06em', color: 'var(--text)' }}>
                    {entry.chordName}
                  </p>
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
          `}</style>
        </>
      )}

      {/* Detection Status Display (visible during playing) */}
      {status === 'ready' && isTimelinePlaying && (
        <div style={{
          marginTop: '16px', padding: '12px 16px',
          background: 'rgba(0,0,0,0.3)', borderRadius: '8px',
          border: '1px solid rgba(100,200,255,0.3)',
          fontFamily: 'monospace', fontSize: '0.75rem', color: '#64C8FF',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            🎤 Live Detection Status
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', lineHeight: 1.6 }}>
            <div>
              <div style={{ color: 'rgba(100,200,255,0.6)', fontSize: '0.65rem' }}>PITCH</div>
              <div>{liveDetectionInfo.pitch > 0 ? `${liveDetectionInfo.pitch.toFixed(1)} Hz` : '—'}</div>
            </div>
            <div>
              <div style={{ color: 'rgba(100,200,255,0.6)', fontSize: '0.65rem' }}>CHORD</div>
              <div style={{ color: liveDetectionInfo.chord ? '#00FF88' : 'rgba(100,200,255,0.5)' }}>
                {liveDetectionInfo.chord || '—'}
              </div>
            </div>
            <div>
              <div style={{ color: 'rgba(100,200,255,0.6)', fontSize: '0.65rem' }}>POSITIONS</div>
              <div>{liveDetectionInfo.positions.length > 0 ? liveDetectionInfo.positions.map(p => p.noteLabel).join(', ') : '—'}</div>
            </div>
            <div>
              <div style={{ color: 'rgba(100,200,255,0.6)', fontSize: '0.65rem' }}>RMS</div>
              <div>{liveDetectionInfo.rms.toFixed(4)}</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ color: 'rgba(100,200,255,0.6)', fontSize: '0.65rem' }}>STATUS</div>
              <div style={{ color: liveDetectionInfo.gated ? '#FF6B6B' : '#64C8FF' }}>
                {liveDetectionInfo.gated ? '🔇 GATED (metronome suppressing)' : '✓ Active'}
              </div>
            </div>
          </div>
        </div>
      )}

      {sessionResult && (
        <div style={{
          marginTop: '16px',
          padding: '18px 20px',
          borderRadius: '14px',
          background: 'rgba(6,214,160,0.08)',
          border: '1px solid rgba(6,214,160,0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#06D6A0' }}>Session Complete</div>
          <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', justifyContent: 'center', color: 'var(--text)' }}>
            <span>Score {sessionResult.score}</span>
            <span>Accuracy {sessionResult.accuracy}%</span>
            <span>Time {sessionResult.avg_completion_time ? Math.ceil(sessionResult.avg_completion_time) : '-'}s</span>
          </div>
          
          {/* Show previous attempt comparison if available */}
          {(() => {
            const stepId = practiceContext?.stepId;
            let prevAttempt = null;
            
            // Look in exercises first (from ExercisesPage)
            const exercise = exercises.find((e) => e.id === stepId);
            if (exercise?.best_score != null) {
              prevAttempt = {
                score: exercise.best_score,
                accuracy: exercise.accuracy,
                time: exercise.avg_completion_time,
              };
            }
            
            // Otherwise look in plan steps (from PracticePlanPage)
            if (!prevAttempt && plan.steps) {
              const step = plan.steps.find((s) => s.id === stepId);
              if (step?.best_score != null) {
                prevAttempt = {
                  score: step.best_score,
                  accuracy: step.accuracy,
                  time: step.avg_completion_time,
                };
              }
            }
            
            if (!prevAttempt) return null;
            
            return (
              <div style={{
                marginTop: '8px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(6,214,160,0.2)',
                width: '100%',
                textAlign: 'center',
                fontSize: '0.85rem',
                color: 'var(--muted)',
              }}>
                <div style={{ marginBottom: '6px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Previous Best
                </div>
                <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <span>Score {prevAttempt.score}</span>
                  <span>Accuracy {prevAttempt.accuracy}%</span>
                  <span>Time {prevAttempt.time ? Math.ceil(prevAttempt.time) : '-'}s</span>
                </div>
              </div>
            );
          })()}
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {activeMode === 'perform' ? (
              <>
                <button className="btn btn-primary" onClick={handleFinish}>✓ Finish</button>
                <button className="btn btn-outline" onClick={handleRestart}>↩ Try Again</button>
              </>
            ) : (
              <>
                <button className="btn btn-primary" onClick={handleRestart}>↩ Play Again</button>
                <button className="btn btn-outline" onClick={handleMenu}>← Back to Menu</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
