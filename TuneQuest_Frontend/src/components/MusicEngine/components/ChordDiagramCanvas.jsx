import React, { useEffect, useRef } from 'react';
import { CHORD_DIAGRAMS } from '../constants/chords';

// ─── ChordDiagramCanvas ────────────────────────────────────────────────────────
// Renders a static guitar chord diagram onto a <canvas> element.
const ChordDiagramCanvas = ({ chordName }) => {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !chordName) return;
    const diagram = CHORD_DIAGRAMS[chordName];
    if (!diagram) return;

    const ctx     = canvas.getContext('2d');
    const W       = canvas.width;
    const H       = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const STRINGS = 6, FRETS = 4;
    const pL = 26, pT = 30, pR = 10;
    const gW = W - pL - pR;
    const gH = H - pT - 16;
    const sG = gW / (STRINGS - 1);
    const fG = gH / FRETS;

    // Fret label
    ctx.fillStyle  = '#555';
    ctx.font       = 'bold 9px monospace';
    ctx.textAlign  = 'right';
    ctx.fillText(`${diagram.startFret}fr`, pL - 4, pT + fG * 0.55);

    // Nut
    if (diagram.startFret === 1) {
      ctx.fillStyle = '#999';
      ctx.fillRect(pL, pT - 4, gW, 4);
    }

    // Grid
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth   = 1;
    for (let f = 0; f <= FRETS; f++) {
      ctx.beginPath(); ctx.moveTo(pL, pT + f * fG); ctx.lineTo(pL + gW, pT + f * fG); ctx.stroke();
    }
    for (let s = 0; s < STRINGS; s++) {
      ctx.beginPath(); ctx.moveTo(pL + s * sG, pT); ctx.lineTo(pL + s * sG, pT + gH); ctx.stroke();
    }

    // Barre
    if (diagram.barre) {
      const { fret, from, to } = diagram.barre;
      const x1 = pL + (from - 1) * sG;
      const x2 = pL + (to - 1) * sG;
      const y  = pT + (fret - diagram.startFret + 0.5) * fG;
      ctx.fillStyle = '#00b386';
      ctx.beginPath();
      ctx.roundRect(x1 - 7, y - 7, x2 - x1 + 14, 14, 7);
      ctx.fill();
    }

    // Finger dots
    for (const [str, fret] of diagram.fingers) {
      const sx = pL + (STRINGS - str) * sG;
      const fy = pT + (fret - diagram.startFret + 0.5) * fG;
      ctx.fillStyle = '#00b386';
      ctx.beginPath();
      ctx.arc(sx, fy, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Open strings
    for (const str of (diagram.open || [])) {
      const sx = pL + (STRINGS - str) * sG;
      ctx.strokeStyle = '#00b386';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(sx, pT - 12, 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Muted strings
    for (const str of (diagram.mute || [])) {
      const sx = pL + (STRINGS - str) * sG;
      ctx.strokeStyle = '#555';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx - 4, pT - 16); ctx.lineTo(sx + 4, pT - 9);
      ctx.moveTo(sx + 4, pT - 16); ctx.lineTo(sx - 4, pT - 9);
      ctx.stroke();
    }
  }, [chordName]);

  return <canvas ref={ref} width={126} height={155} />;
};

export default ChordDiagramCanvas;
