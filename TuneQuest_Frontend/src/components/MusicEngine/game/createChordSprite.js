// ─── Chord sprite factory for Chords Game ────────────────────────────────────
import * as PIXI from 'pixi.js';
import { CHORD_DIAGRAMS } from '../constants/chords';
import { S_TOP, S_GAP } from './layout';

// Creates a PIXI container representing a falling chord on the fretboard highway.
export const createChordSprite = (chordName) => {
  const container = new PIXI.Container();
  const diagram = CHORD_DIAGRAMS[chordName];
  const TOP = S_TOP - 12;
  const BOT = S_TOP + 5 * S_GAP + 12;

  // Translucent full-height pillar marking the chord column
  const pillar = new PIXI.Graphics()
    .roundRect(-10, TOP, 20, BOT - TOP, 10)
    .fill({ color: 0xffffff, alpha: 0.15 });
  container.addChild(pillar);

  // Finger dots derived from chord diagram data
  if (diagram && diagram.fingers) {
    for (const [strNum, fret] of diagram.fingers) {
      const sy = S_TOP + (strNum - 1) * S_GAP;
      const dot = new PIXI.Graphics().circle(0, sy, 18).fill({ color: 0x111111 });
      container.addChild(dot);
      const ft = new PIXI.Text({
        text: `${fret}`,
        style: { fontFamily: 'monospace', fontSize: 13, fill: 0xffffff, fontWeight: 'bold' },
      });
      ft.anchor.set(0.5);
      ft.x = 0;
      ft.y = sy;
      container.addChild(ft);
    }
  }

  // Chord name tag above the top string
  const tagBg = new PIXI.Graphics()
    .roundRect(-28, TOP - 26, 56, 20, 6)
    .fill({ color: 0x111111, alpha: 0.9 });
  const tag = new PIXI.Text({
    text: chordName,
    style: { fontFamily: 'monospace', fontSize: 13, fill: 0xffffff, fontWeight: 'bold' },
  });
  tag.anchor.set(0.5);
  tag.x = 0;
  tag.y = TOP - 15;
  container.addChild(tagBg);
  container.addChild(tag);

  return container;
};
