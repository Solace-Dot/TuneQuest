import { useRef, useState, useCallback, useEffect } from 'react';

// ─── useMetronome ──────────────────────────────────────────────────────────────
// High-precision lookahead scheduler using Web Audio API currentTime.
// Avoids JS-timer drift by scheduling OscillatorNodes slightly ahead of time.
//
// Returns:
//   bpm            — current BPM (number, 20-220)
//   setBpm         — setter (also adjusts live)
//   isPlaying      — boolean
//   currentBeat    — 1-4 (updated on every tick, React state, ~quarter-note)
//   soundProfile   — 'woodblock' | 'monolith'
//   setSoundProfile
//   start(audioCtx) — begin ticking; requires an already-running AudioContext
//   stop            — stop ticking
//   adjustTempo(delta) — increase/decrease BPM by delta (clamped 20-220)
//   onTick          — register a callback: fn(beat, time) called on every beat
//                     `time` is the AudioContext.currentTime of that beat
//   offTick         — remove a previously registered callback
// ──────────────────────────────────────────────────────────────────────────────
const LOOKAHEAD_MS   = 25.0;   // How far ahead (ms) to schedule
const SCHEDULE_AHEAD = 0.1;    // How far ahead (sec) to look in the audio timeline
const MIN_BPM        = 20;
const MAX_BPM        = 220;

const useMetronome = (initialBpm = 80) => {
  // ── state exposed to React UI ──────────────────────────────────────────────
  const [bpm, _setBpm]               = useState(initialBpm);
  const [isPlaying, setIsPlaying]    = useState(false);
  const [currentBeat, setCurrentBeat] = useState(1);
  const [soundProfile, setSoundProfile] = useState('woodblock'); // 'woodblock' | 'monolith'

  // ── scheduling refs (never cause re-renders) ───────────────────────────────
  const audioCtxRef       = useRef(null);  // provided by caller via start()
  const nextBeatTimeRef   = useRef(0);     // AudioContext time of next scheduled beat
  const currentBeatRef    = useRef(1);     // 1-4, shadow of state for scheduler closure
  const bpmRef            = useRef(initialBpm);
  const isPlayingRef      = useRef(false);
  const timerIdRef        = useRef(null);
  const soundProfileRef   = useRef('woodblock');
  const tickCallbacksRef  = useRef(new Set()); // external listeners
  // Exposed so consumers can gate mic detection around each click transient
  const lastTickRef       = useRef(0); // performance.now() of the most recent beat

  // ── setBpm: keeps both state and ref in sync ────────────────────────────────
  const setBpm = useCallback((val) => {
    const clamped = Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(val)));
    bpmRef.current = clamped;
    _setBpm(clamped);
  }, []);

  const adjustTempo = useCallback((delta) => {
    setBpm(bpmRef.current + delta);
  }, [setBpm]);

  // ── Keep soundProfileRef in sync with state ─────────────────────────────────
  useEffect(() => { soundProfileRef.current = soundProfile; }, [soundProfile]);

  // ── Sound generators ────────────────────────────────────────────────────────
  const scheduleWoodblock = useCallback((ctx, time, isDownbeat) => {
    // Short noise burst shaped to sound like a woodblock click
    const bufferSize  = ctx.sampleRate * 0.04; // 40 ms
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data        = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source    = ctx.createBufferSource();
    source.buffer   = noiseBuffer;

    // Band-pass filter: high for regular beats, mid-high for downbeat
    const filter     = ctx.createBiquadFilter();
    filter.type      = 'bandpass';
    filter.frequency.value = isDownbeat ? 900 : 1800;
    filter.Q.value   = isDownbeat ? 6 : 10;

    const gainNode   = ctx.createGain();
    gainNode.gain.setValueAtTime(isDownbeat ? 1.2 : 0.75, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + (isDownbeat ? 0.04 : 0.025));

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(time);
    source.stop(time + 0.05);
  }, []);

  const scheduleMonolith = useCallback((ctx, time, isDownbeat) => {
    // Stone click — short filtered noise burst, like two rocks knocking together
    const duration   = 0.045;  // 45 ms total click length
    const bufferSize = Math.ceil(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data        = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source   = ctx.createBufferSource();
    source.buffer  = noiseBuffer;

    // Low-mid bandpass — stone is denser/lower than wood
    const filter   = ctx.createBiquadFilter();
    filter.type    = 'bandpass';
    filter.frequency.value = isDownbeat ? 500 : 800;
    filter.Q.value = isDownbeat ? 8 : 12;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(isDownbeat ? 0.9 : 0.55, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(time);
    source.stop(time + duration);
  }, []);

  // ── Core scheduler — called every LOOKAHEAD_MS ms ───────────────────────────
  const scheduler = useCallback(() => {
    if (!isPlayingRef.current) return;
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === 'closed') return;

    const lookAheadEnd = ctx.currentTime + SCHEDULE_AHEAD;

    while (nextBeatTimeRef.current < lookAheadEnd) {
      const beatTime    = nextBeatTimeRef.current;
      const beat        = currentBeatRef.current;
      const isDownbeat  = beat === 1;

      // Schedule audio
      if (soundProfileRef.current === 'monolith') {
        scheduleMonolith(ctx, beatTime, isDownbeat);
      } else {
        scheduleWoodblock(ctx, beatTime, isDownbeat);
      }

      // Notify external tick listeners with AudioContext time
      tickCallbacksRef.current.forEach(fn => {
        try { fn(beat, beatTime); } catch (e) {}
      });

      // Schedule the React state update to fire close to the beat
      const msUntilBeat = (beatTime - ctx.currentTime) * 1000;
      const delay       = Math.max(0, msUntilBeat - 4); // fire 4 ms early for setState overhead
      setTimeout(() => {
        if (isPlayingRef.current) {
          lastTickRef.current = performance.now(); // record the wall-clock tick time for mic gating
          setCurrentBeat(beat);
        }
      }, delay);

      // Advance beat counter
      currentBeatRef.current = beat >= 4 ? 1 : beat + 1;
      nextBeatTimeRef.current += 60.0 / bpmRef.current;
    }

    timerIdRef.current = setTimeout(scheduler, LOOKAHEAD_MS);
  }, [scheduleWoodblock, scheduleMonolith]);

  // ── Public API ───────────────────────────────────────────────────────────────
  const start = useCallback((audioCtx) => {
    if (isPlayingRef.current) return;
    if (!audioCtx || audioCtx.state === 'closed') return;

    audioCtxRef.current    = audioCtx;
    isPlayingRef.current   = true;
    currentBeatRef.current = 1;
    nextBeatTimeRef.current = audioCtx.currentTime + 0.05; // tiny offset so first beat isn't instant

    setIsPlaying(true);
    setCurrentBeat(1);
    scheduler();
  }, [scheduler]);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    clearTimeout(timerIdRef.current);
    setIsPlaying(false);
    setCurrentBeat(1);
    currentBeatRef.current = 1;
  }, []);

  // Tick listeners
  const onTick = useCallback((fn) => {
    tickCallbacksRef.current.add(fn);
  }, []);

  const offTick = useCallback((fn) => {
    tickCallbacksRef.current.delete(fn);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    clearTimeout(timerIdRef.current);
    isPlayingRef.current = false;
  }, []);

  return {
    bpm,
    setBpm,
    isPlaying,
    currentBeat,
    soundProfile,
    setSoundProfile,
    start,
    stop,
    adjustTempo,
    onTick,
    offTick,
    bpmRef,      // always-current BPM ref — safe to read inside stale closures
    lastTickRef, // ref to performance.now() of last tick — use for mic-gate checks
  };
};

export default useMetronome;
