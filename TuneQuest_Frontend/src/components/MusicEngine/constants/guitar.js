// ─── Guitar string & note pool constants ─────────────────────────────────────

export const STRINGS_FREQ = [
  { note: 'E4', hz: 329.63 }, { note: 'B3', hz: 246.94 },
  { note: 'G3', hz: 196.00 }, { note: 'D3', hz: 146.83 },
  { note: 'A2', hz: 110.00 }, { note: 'E2', hz: 82.41 },
];

export const NOTE_CHROMATIC = ['E','F','F#','G','G#','A','A#','B','C','C#','D','D#'];

export const OPEN_STRINGS = [
  { string: 1, note: 'E', octave: 4, hz: 329.63 },
  { string: 2, note: 'B', octave: 3, hz: 246.94 },
  { string: 3, note: 'G', octave: 3, hz: 196.00 },
  { string: 4, note: 'D', octave: 3, hz: 146.83 },
  { string: 5, note: 'A', octave: 2, hz: 110.00 },
  { string: 6, note: 'E', octave: 2, hz: 82.41  },
];

export const buildNotePool = (maxFret = 12) => {
  const pool = [];
  for (const s of OPEN_STRINGS) {
    const openIdx = NOTE_CHROMATIC.indexOf(s.note);
    for (let fret = 0; fret <= maxFret; fret++) {
      const noteIdx = (openIdx + fret) % 12;
      const octaveShift = Math.floor((openIdx + fret) / 12);
      const noteName = NOTE_CHROMATIC[noteIdx];
      const octave = s.octave + octaveShift;
      const hz = s.hz * Math.pow(2, fret / 12);
      pool.push({
        string: s.string,
        fret,
        noteName,
        octave,
        noteLabel: `${noteName}${octave}`,
        hz,
      });
    }
  }
  return pool;
};

export const NOTE_POOL = buildNotePool(12);
