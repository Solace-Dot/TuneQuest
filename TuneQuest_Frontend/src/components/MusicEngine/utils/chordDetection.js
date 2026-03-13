// ─── Chord detection via FFT peaks ────────────────────────────────────────────

import { CHORD_TEMPLATES } from '../constants/chords';

// All 12 pitch classes (C-based)
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Convert Hz → pitch class index (0=C … 11=B)
const hzToPitchClass = (hz) => {
  const semitones = 12 * Math.log2(hz / 440);
  return ((Math.round(semitones) % 12) + 12 + 9) % 12; // +9 offsets A=0 → C=0
};

// Extract strongest frequency peaks from FFT data
export const getFFTPeaks = (analyserNode, sampleRate, minHz = 70, maxHz = 1400, topN = 6) => {
  const bufSize = analyserNode.frequencyBinCount;
  const freqData = new Float32Array(bufSize);
  analyserNode.getFloatFrequencyData(freqData);

  const hzPerBin = sampleRate / (bufSize * 2);
  const minBin = Math.floor(minHz / hzPerBin);
  const maxBin = Math.min(Math.ceil(maxHz / hzPerBin), bufSize - 1);

  // Find local maxima above noise floor
  const peaks = [];
  const NOISE_FLOOR = -55; // dB — enough to reject hum but low enough to catch mic input
  for (let i = minBin + 1; i < maxBin - 1; i++) {
    const v = freqData[i];
    if (v > NOISE_FLOOR && v > freqData[i-1] && v > freqData[i+1]) {
      peaks.push({ hz: i * hzPerBin, db: v });
    }
  }

  return peaks.sort((a, b) => b.db - a.db).slice(0, topN);
};

// Match a set of pitch classes to chord templates
export const detectChord = (peaks) => {
  if (peaks.length < 2) return null;

  const pitchClasses = [...new Set(peaks.map(p => hzToPitchClass(p.hz)))];

  let bestChord = null;
  let bestScore = 0;

  for (let root = 0; root < 12; root++) {
    for (const tmpl of CHORD_TEMPLATES) {
      const chordPCs = tmpl.intervals.map(i => (root + i) % 12);
      const matches = chordPCs.filter(pc => pitchClasses.includes(pc)).length;
      const extra   = pitchClasses.filter(pc => !chordPCs.includes(pc)).length;
      const missing = chordPCs.filter(pc => !pitchClasses.includes(pc)).length;
      // Penalise extra + missing notes so G triad beats Em7 on the same G/B/D input
      const score = matches - extra * 0.5 - missing * 0.4;

      if (score > bestScore && matches >= 2) {
        bestScore = score;
        bestChord = { root: NOTE_NAMES[root], suffix: tmpl.suffix, score, matches };
      }
    }
  }

  return bestChord;
};
