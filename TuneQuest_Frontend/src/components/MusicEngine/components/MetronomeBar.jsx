import React, { useEffect, useRef } from 'react';

const MIN_BPM = 20;
const MAX_BPM = 220;

// ─── MetronomeBar ──────────────────────────────────────────────────────────────
// Self-contained metronome UI strip.
//
// Props:
//   bpm              — current BPM (number)
//   setBpm           — setter
//   isPlaying        — boolean
//   currentBeat      — 1-4
//   soundProfile     — 'woodblock' | 'monolith'
//   setSoundProfile
//   onToggle()       — called when play/stop button is pressed
//   onBpmChange(val) — called when BPM slider or tap tempo fires
//   waveformRef      — optional ref to the waveform container div; if provided,
//                      its border will pulse on each beat
// ──────────────────────────────────────────────────────────────────────────────
const MetronomeBar = ({
  bpm,
  isPlaying,
  currentBeat,
  soundProfile,
  setSoundProfile,
  onToggle,
  onBpmChange,
  waveformRef,
  hideBpmRow = false,
  isEnabled,           // if provided, button shows 🔔/🔕 instead of ▶/■
}) => {
  // Tap-tempo accumulator
  const tapTimesRef = useRef([]);

  // ── Waveform border pulse ──────────────────────────────────────────────────
  const pulseActiveRef = useRef(false);
  useEffect(() => {
    if (!waveformRef?.current || !isPlaying) return;
    if (pulseActiveRef.current) return;
    // Already handled via currentBeat effect below
  }, [isPlaying, waveformRef]);

  useEffect(() => {
    const el = waveformRef?.current;
    if (!el || !isPlaying) return;

    const isDownbeat = currentBeat === 1;
    const color      = isDownbeat ? '#9f86ff' : '#5fe0c0';
    el.style.transition = 'box-shadow 0.04s ease, border-color 0.04s ease';
    el.style.boxShadow  = `0 0 ${isDownbeat ? '22px' : '10px'} 2px ${color}66`;
    el.style.borderColor = color;

    const clear = setTimeout(() => {
      el.style.boxShadow  = '';
      el.style.borderColor = '';
    }, 120);

    return () => clearTimeout(clear);
  }, [currentBeat, isPlaying, waveformRef]);

  // ── Tap tempo ──────────────────────────────────────────────────────────────
  const handleTap = () => {
    const now  = performance.now();
    const taps = tapTimesRef.current;
    taps.push(now);
    // Keep only the last 6 taps and only those within 3 s of each other
    const recent = taps.filter(t => now - t < 3000).slice(-6);
    tapTimesRef.current = recent;
    if (recent.length >= 2) {
      let totalGap = 0;
      for (let i = 1; i < recent.length; i++) totalGap += recent[i] - recent[i - 1];
      const avgGap = totalGap / (recent.length - 1);
      const tapped = Math.round(60000 / avgGap);
      onBpmChange(Math.max(MIN_BPM, Math.min(MAX_BPM, tapped)));
    }
  };

  // ── BPM to descriptive label ───────────────────────────────────────────────
  const tempoLabel = (b) => {
    if (b < 60)  return 'Largo';
    if (b < 76)  return 'Adagio';
    if (b < 108) return 'Andante';
    if (b < 120) return 'Moderato';
    if (b < 156) return 'Allegro';
    if (b < 176) return 'Vivace';
    return 'Presto';
  };

  const beatDot = (beatNum) => {
    const isThis     = currentBeat === beatNum && isPlaying;
    const isDownbeat = beatNum === 1;
    return (
      <div
        key={beatNum}
        style={{
          width:        isDownbeat ? '14px' : '10px',
          height:       isDownbeat ? '14px' : '10px',
          borderRadius: '50%',
          flexShrink:   0,
          transition:   'background 0.05s ease, box-shadow 0.05s ease, transform 0.05s ease',
          background:   isThis
            ? isDownbeat ? '#9f86ff' : '#5fe0c0'
            : 'var(--panel-2)',
          boxShadow:    isThis
            ? `0 0 ${isDownbeat ? '14px' : '8px'} 2px ${isDownbeat ? '#9f86ff' : '#5fe0c0'}`
            : 'none',
          transform:    isThis ? 'scale(1.25)' : 'scale(1)',
          border:       isDownbeat ? '2px solid rgba(159,134,255,0.35)' : '1px solid rgba(95,224,192,0.25)',
        }}
      />
    );
  };

  return (
    <div
      style={{
        background:   'var(--panel-1)',
        borderRadius: '18px',
        border:       '1px solid var(--border)',
        padding:      '14px 20px',
        display:      'flex',
        flexDirection: 'column',
        gap:          '12px',
      }}
    >
      {/* Row 1: label + beat dots + play button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize:      '0.6rem',
            textTransform: 'uppercase',
            letterSpacing: '0.45em',
            color:         'var(--muted)',
            flexShrink:    0,
          }}
        >
          Metronome
        </span>

        {/* LED beat indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {[1, 2, 3, 4].map(beatDot)}
        </div>

        {/* BPM readout */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', flexShrink: 0 }}>
          <span
            style={{
              fontSize:   '1.5rem',
              fontWeight: 900,
              fontFamily: 'monospace',
              color:      isPlaying ? 'var(--text)' : 'var(--muted)',
              lineHeight: 1,
              transition: 'color 0.2s',
            }}
          >
            {bpm}
          </span>
          <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--muted)' }}>
            bpm
          </span>
        </div>

        <span
          style={{
            fontSize:      '0.6rem',
            textTransform: 'uppercase',
            letterSpacing: '0.25em',
            color:         isPlaying ? 'var(--accent)' : 'var(--muted)',
            opacity:       0.8,
            transition:    'color 0.2s',
            flexShrink:    0,
          }}
        >
          {tempoLabel(bpm)}
        </span>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Sound profile toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {['woodblock', 'monolith'].map(profile => (
            <button
              key={profile}
              onClick={() => setSoundProfile(profile)}
              style={{
                padding:       '4px 10px',
                borderRadius:  '999px',
                fontSize:      '0.58rem',
                textTransform: 'uppercase',
                letterSpacing: '0.25em',
                fontWeight:    700,
                border:        '1px solid var(--border)',
                cursor:        'pointer',
                transition:    'all 0.2s',
                background:    soundProfile === profile
                  ? profile === 'woodblock' ? 'rgba(159,134,255,0.18)' : 'rgba(95,224,192,0.15)'
                  : 'transparent',
                color:         soundProfile === profile
                  ? profile === 'woodblock' ? '#9f86ff' : '#5fe0c0'
                  : 'var(--muted)',
                boxShadow: soundProfile === profile
                  ? `0 0 8px 1px ${profile === 'woodblock' ? '#9f86ff33' : '#5fe0c033'}`
                  : 'none',
              }}
            >
              {profile === 'woodblock' ? 'Woodblock' : 'Stone Click'}
            </button>
          ))}
        </div>

        {/* Play / Stop  –or–  Enable / Disable toggle */}
        <button
          onClick={onToggle}
          title={isEnabled !== undefined ? (isEnabled ? 'Disable metronome' : 'Enable metronome') : (isPlaying ? 'Stop' : 'Start')}
          style={{
            width:        '36px',
            height:       '36px',
            borderRadius: '50%',
            border:       'none',
            cursor:       'pointer',
            flexShrink:   0,
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            background:   isEnabled !== undefined
              ? isEnabled
                ? 'rgba(95,224,192,0.18)'
                : 'rgba(239,68,68,0.12)'
              : isPlaying
                ? 'rgba(239,68,68,0.18)'
                : 'linear-gradient(135deg, var(--primary-soft), var(--accent))',
            color:        isEnabled !== undefined
              ? isEnabled ? '#5fe0c0' : '#ef4444'
              : isPlaying ? '#ef4444' : 'var(--bg)',
            fontSize:     isEnabled !== undefined ? '1.1rem' : '1rem',
            fontWeight:   900,
            transition:   'all 0.2s',
            boxShadow:    (isEnabled !== undefined ? isEnabled : isPlaying)
              ? '0 0 10px 2px rgba(95,224,192,0.22)'
              : '0 4px 14px rgba(0,0,0,0.35)',
          }}
        >
          {isEnabled !== undefined ? (isEnabled ? '🔔' : '🔕') : (isPlaying ? '■' : '▶')}
        </button>
      </div>

      {/* Row 2: BPM slider + tap tempo */}
      {!hideBpmRow && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--muted)', flexShrink: 0 }}>
          {MIN_BPM}
        </span>
        <input
          type="range"
          min={MIN_BPM}
          max={MAX_BPM}
          step="1"
          value={bpm}
          onChange={e => onBpmChange(Number(e.target.value))}
          style={{
            flex:         1,
            height:       '4px',
            borderRadius: '9999px',
            cursor:       'pointer',
            accentColor:  'var(--primary)',
            background:   `linear-gradient(to right, var(--primary) ${((bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * 100}%, var(--panel-2) ${((bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * 100}%)`,
            appearance:   'none',
            WebkitAppearance: 'none',
          }}
        />
        <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--muted)', flexShrink: 0 }}>
          {MAX_BPM}
        </span>
        <button
          onClick={handleTap}
          style={{
            padding:       '5px 12px',
            borderRadius:  '999px',
            fontSize:      '0.6rem',
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            fontWeight:    700,
            border:        '1px solid var(--border)',
            background:    'transparent',
            color:         'var(--muted)',
            cursor:        'pointer',
            transition:    'all 0.15s',
            flexShrink:    0,
          }}
          onMouseDown={e => { e.currentTarget.style.background = 'rgba(159,134,255,0.15)'; e.currentTarget.style.color = '#9f86ff'; }}
          onMouseUp={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
        >
          Tap
        </button>
      </div>
      )}
    </div>
  );
};

export default MetronomeBar;
