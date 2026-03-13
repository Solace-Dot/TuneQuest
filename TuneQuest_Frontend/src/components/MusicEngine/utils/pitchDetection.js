// ─── Pitch octave correction & fret position lookup ───────────────────────────

export const MIN_GUITAR_HZ = 70;   // slightly below E2 (82.41 Hz)
export const MAX_GUITAR_HZ = 1400; // well above E4 (330 Hz), covers up to fret 24

// YIN often latches onto the 2nd or 4th harmonic instead of the fundamental,
// especially through a laptop mic where low frequencies are weak.
// Walk the detected pitch DOWN by octaves until it's within the guitar range.
export const correctOctave = (pitch) => {
  if (!pitch) return pitch;
  if (pitch >= MIN_GUITAR_HZ && pitch <= MAX_GUITAR_HZ) return pitch;
  let p = pitch;
  while (p > MAX_GUITAR_HZ) {
    const half = p / 2;
    if (half < MIN_GUITAR_HZ) break;
    p = half;
  }
  return p;
};

const GUITAR_STRINGS = [
  { note: 'E2', hz: 82.41,  num: 6 },
  { note: 'A2', hz: 110.00, num: 5 },
  { note: 'D3', hz: 146.83, num: 4 },
  { note: 'G3', hz: 196.00, num: 3 },
  { note: 'B3', hz: 246.94, num: 2 },
  { note: 'E4', hz: 329.63, num: 1 },
];

const NOTE_CHROMATIC_FOR_POS = ['E','F','F#','G','G#','A','A#','B','C','C#','D','D#'];
const OPEN_OCTAVES  = { 6: 2, 5: 2, 4: 3, 3: 3, 2: 3, 1: 4 }; // string → open octave
const OPEN_NOTE_IDX = { 6: 0, 5: 5, 4: 10, 3: 3, 2: 7, 1: 0 }; // string → chromatic index

// Returns ALL string/fret positions for the detected pitch.
// e.g. 110 Hz → [{ str: 5, fret: 0 }, { str: 6, fret: 5 }]
export const getAllNotePositions = (pitch) => {
  if (!pitch) return [];
  const candidates = [];

  for (const s of GUITAR_STRINGS) {
    const fret = Math.round(12 * Math.log2(pitch / s.hz));
    if (fret < 0 || fret > 24) continue;
    const expectedHz = s.hz * Math.pow(2, fret / 12);
    const centsDiff = Math.abs(1200 * Math.log2(expectedHz / pitch));

    const openIdx = OPEN_NOTE_IDX[s.num];
    const noteIdx = (openIdx + fret) % 12;
    const octaveShift = Math.floor((openIdx + fret) / 12);
    const noteName = NOTE_CHROMATIC_FOR_POS[noteIdx];
    const octave = OPEN_OCTAVES[s.num] + octaveShift;
    const noteLabel = `${noteName}${octave}`;

    candidates.push({ stringNote: s.note, stringNum: s.num, fret, hz: expectedHz, centsDiff, noteLabel });
  }

  if (candidates.length === 0) return [];

  candidates.sort((a, b) => {
    if (Math.abs(a.centsDiff - b.centsDiff) > 5) return a.centsDiff - b.centsDiff;
    if (a.fret !== b.fret) return a.fret - b.fret;
    return b.stringNum - a.stringNum;
  });

  const bestCents = candidates[0].centsDiff;
  return candidates.filter(c => Math.abs(c.centsDiff - bestCents) <= 20);
};
