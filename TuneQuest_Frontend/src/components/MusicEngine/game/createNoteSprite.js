// ─── Note sprite factory for Notes Game ───────────────────────────────────────
import * as PIXI from 'pixi.js';
import { S_TOP, S_GAP } from './layout';

// Creates a PIXI container representing a falling note on the fretboard highway.
// mode: 'note' shows note name (e.g. 'C4'), 'number' shows fret number (e.g. '3' or 'O')
export const createNoteSprite = (poolEntry, mode) => {
  const container = new PIXI.Container();
  const sIdx    = poolEntry.string - 1; // 0 = high E, 5 = low E
  const targetY = S_TOP + sIdx * S_GAP;
  const TOP     = S_TOP - 12;

  // Black circle at the target string position
  const circle = new PIXI.Graphics().circle(0, targetY, 18).fill({ color: 0x111111 });
  container.addChild(circle);

  // Label inside the circle
  const label = mode === 'note' ? poolEntry.noteLabel
    : (poolEntry.fret === 0 ? 'O' : `${poolEntry.fret}`);
  const circleText = new PIXI.Text({
    text: label,
    style: { fontFamily: 'monospace', fontSize: 13, fill: 0xffffff, fontWeight: 'bold' },
  });
  circleText.anchor.set(0.5);
  circleText.x = 0;
  circleText.y = targetY;
  container.addChild(circleText);

  // Note name tag above the top string
  const tagBg = new PIXI.Graphics()
    .roundRect(-22, TOP - 24, 44, 18, 5)
    .fill({ color: 0x111111, alpha: 0.9 });
  const tag = new PIXI.Text({
    text: poolEntry.noteLabel,
    style: { fontFamily: 'monospace', fontSize: 11, fill: 0xffffff, fontWeight: 'bold' },
  });
  tag.anchor.set(0.5);
  tag.x = 0;
  tag.y = TOP - 15;
  container.addChild(tagBg);
  container.addChild(tag);

  return container;
};
