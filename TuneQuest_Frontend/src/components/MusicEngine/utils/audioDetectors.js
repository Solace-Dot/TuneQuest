// ─── Multi-algorithm pitch detectors (ACF + YIN + AMDF) ──────────────────────

import { YIN, AMDF } from 'pitchfinder';

// ─── Autocorrelation pitch detector (ACF) ─────────────────────────────────────
// Optimised range: only computes lags that map to 70–1400 Hz
const makeACF = (sampleRate) => (buffer) => {
  const SIZE = buffer.length;
  const MIN_FREQ = 70;
  const MAX_FREQ = 1400;

  const minLag = Math.floor(sampleRate / MAX_FREQ); // ~32 at 44.1 kHz
  const maxLag = Math.floor(sampleRate / MIN_FREQ); // ~630 at 44.1 kHz
  const INNER  = Math.min(Math.floor(SIZE / 2), 2048);

  // Lower RMS threshold — laptop mic signals are weak
  let rms = 0;
  for (let i = 0; i < INNER; i++) rms += buffer[i] * buffer[i];
  if (Math.sqrt(rms / INNER) < 0.005) return null;

  const acf = new Float32Array(maxLag + 2);
  for (let lag = 0; lag <= maxLag + 1; lag++) {
    let sum = 0;
    for (let i = 0; i < INNER; i++) sum += buffer[i] * buffer[i + lag];
    acf[lag] = sum;
  }

  let startLag = minLag;
  for (let i = minLag; i < maxLag - 1; i++) {
    if (acf[i + 1] > acf[i]) { startLag = i; break; }
  }

  let bestLag = -1;
  let bestVal = -Infinity;
  for (let i = startLag; i < maxLag; i++) {
    if (acf[i] > bestVal && acf[i] > acf[i - 1] && acf[i] > acf[i + 1]) {
      bestVal = acf[i];
      bestLag = i;
    }
  }

  if (bestLag < 1) return null;

  // Subharmonic correction — iteratively halve the lag while a local max exists
  // near the half-period AND has ≥55% of the current best correlation.
  for (let pass = 0; pass < 4; pass++) {
    const halfLag = Math.round(bestLag / 2);
    if (halfLag < minLag) break;
    const win = Math.max(2, Math.round(halfLag * 0.04));
    let nearPeak = halfLag, nearVal = acf[halfLag];
    for (let j = halfLag - win; j <= halfLag + win; j++) {
      if (j >= minLag && j < maxLag && acf[j] > nearVal) {
        nearVal = acf[j]; nearPeak = j;
      }
    }
    if (nearVal >= 0.55 * bestVal &&
        acf[nearPeak] > acf[nearPeak - 1] && acf[nearPeak] > acf[nearPeak + 1]) {
      bestLag = nearPeak;
      bestVal = nearVal;
    } else {
      break;
    }
  }

  const alpha = acf[bestLag - 1], beta = acf[bestLag], gamma = acf[bestLag + 1];
  const refinedLag = bestLag - 0.5 * (gamma - alpha) / (2 * beta - alpha - gamma);
  const freq = sampleRate / refinedLag;

  const confidence = bestVal / (acf[0] + 1e-9);
  if (confidence < 0.15) return null;

  return freq;
};

// ─── Dynamic YIN Threshold ─────────────────────────────────────────────────────
const getDynamicThreshold = (buffer, sampleRate) => {
  const hzPerBin = sampleRate / buffer.length;
  let lowEnergy = 0, highEnergy = 0;
  for (let i = 0; i < buffer.length / 2; i++) {
    const hz = i * hzPerBin;
    const v = buffer[i] * buffer[i];
    if (hz < 300) lowEnergy += v;
    else highEnergy += v;
  }
  const ratio = lowEnergy / (highEnergy + 1e-9);
  if (ratio > 0.5) return 0.05;
  if (ratio > 0.2) return 0.08;
  return 0.10;
};

// ─── RMS helper ────────────────────────────────────────────────────────────────
export const getRMS = (buffer) => {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
};

// ─── Multi-detector factory ────────────────────────────────────────────────────
// Uses a standard SNR-style gate: signal RMS must be N dB above adaptive noise.
const SEMITONE = Math.pow(2, 1 / 12);
const MIN_SIGNAL_DB_ABOVE_NOISE = 6; // ~2× in amplitude; friendlier to high strings
const CALIBRATION_FRAMES = 40;
const ABS_MIN_RMS = 0.0025; // absolute floor to reject near-silence / hiss

export const makeDetectors = (sampleRate) => {
  const acf = makeACF(sampleRate);
  const yinLoose  = YIN({ sampleRate, threshold: 0.05 });
  const yinMid    = YIN({ sampleRate, threshold: 0.08 });
  const yinStrict = YIN({ sampleRate, threshold: 0.10 });
  const amdf      = AMDF({ sampleRate, minFrequency: 70, maxFrequency: 1400 });

  let frameCount = 0;
  let noiseFloor = 0.005; // conservative starting default
  let calibrating = true;
  let noiseSum = 0;

  return (buffer) => {
    frameCount++;
    const rms = getRMS(buffer);

    // Calibrate noise floor from first ~40 frames of silence
    if (calibrating) {
      noiseSum += rms;
      if (frameCount >= CALIBRATION_FRAMES) {
        noiseFloor = Math.max(noiseSum / CALIBRATION_FRAMES, 0.003);
        calibrating = false;
      }
      return undefined; // don't detect during calibration
    }

    const noiseGate = Math.max(
      ABS_MIN_RMS,
      noiseFloor * Math.pow(10, MIN_SIGNAL_DB_ABOVE_NOISE / 20)
    );
    if (rms < noiseGate) {
      noiseFloor = noiseFloor * 0.995 + rms * 0.005;
      return null;
    }

    // Throttle: only run full detection every 3rd frame
    if (frameCount % 3 !== 0) return undefined;

    const thresh = getDynamicThreshold(buffer, sampleRate);
    const yin = thresh <= 0.05 ? yinLoose : thresh <= 0.08 ? yinMid : yinStrict;

    const pitchYIN  = yin(buffer);
    const pitchACF  = acf(buffer);
    const pitchAMDF = amdf(buffer);

    const candidates = [pitchYIN, pitchACF, pitchAMDF]
      .filter(p => p && p > 70 && p < 1400);

    if (candidates.length === 0) return null;

    // Vote: how many detectors agree within 1 semitone
    let bestPitch = null, bestVotes = 0;
    for (const c of candidates) {
      const votes = candidates.filter(
        p => Math.abs(Math.log2(p / c)) < Math.log2(SEMITONE)
      ).length;
      if (votes > bestVotes) { bestVotes = votes; bestPitch = c; }
    }

    if (bestVotes >= 2) {
      // Guard against subharmonic bias: if an octave-up exists in the candidates,
      // the majority pitch is likely a subharmonic artefact — prefer the higher one.
      const octaveUp = bestPitch * 2;
      if (octaveUp < 1400) {
        const hasOctaveUp = candidates.some(
          p => Math.abs(Math.log2(p / octaveUp)) < Math.log2(SEMITONE)
        );
        if (hasOctaveUp) return octaveUp;
      }
      return bestPitch;
    }

    // Low strings (E2/A2) are hard for all detectors to agree through a laptop mic.
    // Allow a single strong result only for frequencies below 130 Hz.
    if (candidates.length === 1 && bestPitch < 130 && rms > noiseGate * 1.5) return bestPitch;

    return null;
  };
};
