// ─── Chord data: templates, diagrams, game chord list ────────────────────────

// Common open chords used in the game — root + suffix
export const GAME_CHORDS = [
  'C','G','D','A','E','Am','Em','Dm',
  'A7','E7','D7','G7','B7',
  'Cmaj7','Gmaj7','Amaj7','Fmaj7',
  'Am7','Em7','Dm7',
];

// Chord templates: root-relative semitone intervals
export const CHORD_TEMPLATES = [
  { suffix: '',    intervals: [0, 4, 7] },       // Major
  { suffix: 'm',   intervals: [0, 3, 7] },       // Minor
  { suffix: '7',   intervals: [0, 4, 7, 10] },   // Dominant 7
  { suffix: 'maj7',intervals: [0, 4, 7, 11] },   // Major 7
  { suffix: 'm7',  intervals: [0, 3, 7, 10] },   // Minor 7
  { suffix: 'sus2',intervals: [0, 2, 7] },        // Sus2
  { suffix: 'sus4',intervals: [0, 5, 7] },        // Sus4
];

// fingers: array of [string(1=high E, 6=low E), fret]
// open: array of string numbers that are played open
// mute: array of string numbers that are muted
export const CHORD_DIAGRAMS = {
  'C':     { fingers: [[2,1],[4,2],[5,3]], open: [1,3], mute: [6], startFret: 1 },
  'G':     { fingers: [[1,3],[5,2],[6,3]], open: [2,3,4], mute: [], startFret: 1 },
  'D':     { fingers: [[1,2],[2,3],[3,2]], open: [4], mute: [5,6], startFret: 1 },
  'A':     { fingers: [[2,2],[3,2],[4,2]], open: [1,5], mute: [6], startFret: 1 },
  'E':     { fingers: [[3,1],[4,2],[5,2]], open: [1,2,6], mute: [], startFret: 1 },
  'Am':    { fingers: [[2,1],[3,2],[4,2]], open: [1,5], mute: [6], startFret: 1 },
  'Em':    { fingers: [[4,2],[5,2]], open: [1,2,3,6], mute: [], startFret: 1 },
  'Dm':    { fingers: [[1,1],[2,3],[3,2]], open: [4], mute: [5,6], startFret: 1 },
  'A7':    { fingers: [[2,2],[4,2]], open: [1,3,5], mute: [6], startFret: 1 },
  'E7':    { fingers: [[3,1],[5,2]], open: [1,2,4,6], mute: [], startFret: 1 },
  'D7':    { fingers: [[1,2],[2,1],[3,2]], open: [4], mute: [5,6], startFret: 1 },
  'G7':    { fingers: [[1,1],[5,2],[6,3]], open: [2,3,4], mute: [], startFret: 1 },
  'B7':    { fingers: [[1,2],[3,2],[5,2],[4,1]], open: [2], mute: [6], startFret: 1 },
  'Cmaj7': { fingers: [[4,2],[5,3]], open: [1,2,3], mute: [6], startFret: 1 },
  'Gmaj7': { fingers: [[1,2],[6,3]], open: [2,3,4,5], mute: [], startFret: 1 },
  'Amaj7': { fingers: [[2,2],[3,1],[4,2]], open: [1,5], mute: [6], startFret: 1 },
  'Fmaj7': { fingers: [[2,1],[3,2],[4,3]], open: [1], mute: [5,6], startFret: 1 },
  'Am7':   { fingers: [[2,1],[4,2]], open: [1,3,5], mute: [6], startFret: 1 },
  'Em7':   { fingers: [[5,2]], open: [1,2,3,4,6], startFret: 1 },
  'Dm7':   { fingers: [[1,1],[2,1],[3,2]], open: [4], mute: [5,6], startFret: 1 },
};
