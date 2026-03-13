// ─── MIDI-based note label helpers for soundfont-player ──────────────────────
// Converts guitar string+fret to the note label format soundfont-player expects.

import { CHORD_DIAGRAMS } from '../constants/chords';

const CHROMATIC_SCALE_C = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const STRING_MIDI_BASE  = { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 };

const midiToNoteLabel = (midi) =>
  `${CHROMATIC_SCALE_C[midi % 12]}${Math.floor(midi / 12) - 1}`;

export const stringFretToSamplerNote = (stringNum, fret) =>
  midiToNoteLabel(STRING_MIDI_BASE[stringNum] + fret);

// Pre-compute all sampler note labels for a named chord (fingers + open strings)
export const getChordSamplerNotes = (chordName) => {
  const d = CHORD_DIAGRAMS[chordName];
  if (!d) return [];
  return [
    ...d.fingers.map(([str, fret]) => stringFretToSamplerNote(str, fret)),
    ...(d.open || []).map(str => stringFretToSamplerNote(str, 0)),
  ];
};
