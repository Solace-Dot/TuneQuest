// ─── SongManager.js ──────────────────────────────────────────────────────────
// Renders a concrete song payload as a scrolling pill timeline on a PixiJS stage.
// Designed to reuse the existing MusicEngine layout, geometry, and sprite style.
//
// Usage:
//   const clock = new BeatClock(songPayload.bpm);
//   const mgr   = new SongManager(songPayload, app.stage);
//   mgr.drawBoard();
//   clock.start();
//   app.ticker.add(() => mgr.update(clock.getCurrentBeat()));
//   // To stop: clock.pause(); mgr.destroy();
// ─────────────────────────────────────────────────────────────────────────────
import * as PIXI from 'pixi.js';

import { S_TOP, S_GAP }    from './game/layout';
import { NOTE_POOL, STRINGS_FREQ } from './constants/guitar';
import { CHORD_DIAGRAMS }  from './constants/chords';

// ─── Canvas / layout geometry (matches existing MusicEngine) ─────────────────
const HIT_X       = 136;              // px – x-centre of the cyan pillar (hit zone)
const SPAWN_X     = 850;              // px – right-edge note spawn position (off-screen)
const LEAD_BEATS  = 4;                // beats of advance time before a note hits
const TRAVEL_DIST = SPAWN_X - HIT_X; // 714 px
const CANVAS_W    = 800;
const CANVAS_H    = 420;

// Pixels per beat so a note exactly LEAD_BEATS ahead spawns at SPAWN_X:
//   HIT_X + LEAD_BEATS * SCROLL_SPEED = SPAWN_X  →  SCROLL_SPEED = 714/4 = 178.5
const SCROLL_SPEED = TRAVEL_DIST / LEAD_BEATS; // ~178.5 px/beat

// ─── Palette (matches MusicEngine purple theme) ───────────────────────────────
const COLOR_NOTE_FILL   = 0x7B3CC4;  // tap note body
const COLOR_NOTE_STROKE = 0xCC99FF;  // tap note border / hold note border
const COLOR_HOLD_FILL   = 0x4A0080;  // hold note body (darker)
const COLOR_HOLD_HEAD   = 0x9D4EDD;  // hold note leading cap
const COLOR_CHORD_PILLAR = 0xffffff; // chord pillar base
const COLOR_LABEL_BG    = 0x111111;  // name-tag background
const COLOR_HIT_TINT    = 0x06D6A0;  // cyan flash in-hit-zone (matches engine pillar)
const COLOR_STRING      = 0x7B3CC4;  // horizontal string lines
const COLOR_BOARD_BG       = 0x5B21B6;  // canvas background (matches engine)
const COLOR_RESONANCE_GLOW = 0x00FFFF;  // pillar bloom when a hold note is resonating
const COLOR_RESONANCE_RING = 0x00E5CC;  // expanding ring particle colour

const ENHARMONIC_TO_SHARP = {
  Cb: 'B',
  Db: 'C#',
  Eb: 'D#',
  Fb: 'E',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
  'E#': 'F',
  'B#': 'C',
};

function normalizeNoteLabel(noteLabel) {
  if (typeof noteLabel !== 'string') return null;
  const cleaned = noteLabel.trim().replace(/♯/g, '#').replace(/♭/g, 'b');
  const match = cleaned.match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!match) return null;

  const letter = match[1].toUpperCase();
  const accidental = match[2];
  const octave = match[3];
  const pitchClass = ENHARMONIC_TO_SHARP[`${letter}${accidental}`] || `${letter}${accidental}`;

  return `${pitchClass}${octave}`;
}

// ─── Internal helper: resolve a note label (e.g. "E4") to its NOTE_POOL entry ─
// Returns the lowest-fret entry among all positions for the given label, or null.
function resolveNoteEntry(noteLabel) {
  const normalized = normalizeNoteLabel(noteLabel);
  if (!normalized) return null;
  const matches = NOTE_POOL.filter(e => e.noteLabel === normalized);
  if (!matches.length) return null;
  return matches.reduce((best, e) => (!best || e.fret < best.fret ? e : best), null);
}

// ─────────────────────────────────────────────────────────────────────────────
// renderPill
// Builds a PIXI.Container for one song-timeline event.
// The container's x=0 aligns with the note's beat hit-point (left/head of pill).
//
// @param  {object} event        { beat, type, value, duration }
// @param  {string} displayMode  'note' (default) | 'fret'
// @returns {{ container: PIXI.Container, event, isHeld: boolean } | null}
// ─────────────────────────────────────────────────────────────────────────────
export function renderPill(event, displayMode = 'note') {
  const { type, value, duration = 1 } = event;
  const isHeld   = duration > 1.0;
  const pillW    = Math.max(36, duration * SCROLL_SPEED); // width of hold body
  const pillH    = 28;                                    // pill height (diameter for circles)
  const radius   = pillH / 2;
  const container = new PIXI.Container();

  // ── Note pill ──────────────────────────────────────────────────────────────
  if (type === 'note') {
    const normalizedValue = normalizeNoteLabel(value);
    const entry = resolveNoteEntry(normalizedValue || value);
    if (!entry) return null;

    const sIdx = entry.string - 1;           // 0 = high-E, 5 = low-E
    const cy   = S_TOP + sIdx * S_GAP;       // vertical centre on the fretboard string

    // Note label: note name (e.g. "E4") or fret position (e.g. "0")
    const pillLabel = displayMode === 'fret' ? `${entry.fret}` : (normalizedValue || value);
    const tagLabel  = displayMode === 'fret' ? `S${entry.string} ${entry.fret}` : (normalizedValue || value);

    if (isHeld) {
      // ── Hold pill: elongated capsule spanning [0 .. pillW] horizontally ───

      // Resonance glow layer — sits behind the body; pulsed when the note is being held
      const glowLayer = new PIXI.Graphics()
        .roundRect(-5, cy - radius - 5, pillW + 10, pillH + 10, radius + 5)
        .fill({ color: COLOR_RESONANCE_GLOW, alpha: 0.3 });
      glowLayer.visible = false;
      container.addChild(glowLayer);
      container._glowGraphic = glowLayer;

      // Body — extends rightward (future beats are to the right on screen)
      const body = new PIXI.Graphics()
        .roundRect(0, cy - radius, pillW, pillH, radius)
        .fill({ color: COLOR_HOLD_FILL, alpha: 0.88 });
      container.addChild(body);
      container._primaryBody = body;

      // Stroke outline drawn separately (PIXI 8 fill/stroke are separate passes)
      const outline = new PIXI.Graphics()
        .roundRect(0, cy - radius, pillW, pillH, radius)
        .stroke({ width: 2, color: COLOR_NOTE_STROKE, alpha: 0.9 });
      container.addChild(outline);

      // Leading cap: filled circle at x=0 (the head that reaches the hit zone first)
      const cap = new PIXI.Graphics()
        .circle(0, cy, radius + 2)
        .fill({ color: COLOR_HOLD_HEAD });
      container.addChild(cap);

      // Label on the cap
      const capLabel = new PIXI.Text({
        text: pillLabel,
        style: { fontFamily: 'monospace', fontSize: 11, fill: 0xffffff, fontWeight: 'bold' },
      });
      capLabel.anchor.set(0.5);
      capLabel.x = 0;
      capLabel.y = cy;
      container.addChild(capLabel);

    } else {
      // ── Tap pill: single circle (matches createNoteSprite style) ──────────
      const circle = new PIXI.Graphics()
        .circle(0, cy, radius)
        .fill({ color: COLOR_NOTE_FILL });
      container.addChild(circle);
      container._primaryBody = circle;

      const circleLabel = new PIXI.Text({
        text: pillLabel,
        style: { fontFamily: 'monospace', fontSize: 12, fill: 0xffffff, fontWeight: 'bold' },
      });
      circleLabel.anchor.set(0.5);
      circleLabel.x = 0;
      circleLabel.y = cy;
      container.addChild(circleLabel);
    }

    // Name tag above the top string (matches createNoteSprite tag style)
    const TOP    = S_TOP - 36;
    const tagBg  = new PIXI.Graphics()
      .roundRect(-24, TOP - 2, 48, 18, 5)
      .fill({ color: COLOR_LABEL_BG, alpha: 0.9 });
    const tagTxt = new PIXI.Text({
      text: tagLabel,
      style: { fontFamily: 'monospace', fontSize: 11, fill: 0xffffff, fontWeight: 'bold' },
    });
    tagTxt.anchor.set(0.5);
    tagTxt.x = 0;
    tagTxt.y = TOP + 7;
    container.addChild(tagBg);
    container.addChild(tagTxt);

    // Store metadata for the update loop
    container._noteEntry = entry;
    container._isNote    = true;
    container._holdStart = event.beat;
    container._holdEnd   = event.beat + duration;

  // ── Chord pill ─────────────────────────────────────────────────────────────
  } else if (type === 'chord') {
    const chordName = Array.isArray(value) ? value[0] : value;
    const diagram   = CHORD_DIAGRAMS[chordName];
    const TOP       = S_TOP - 12;
    const BOT       = S_TOP + 5 * S_GAP + 12;

    // Translucent pillar — widened for hold chords (duration > 1)
    const pillarW = isHeld ? pillW : 20;
    const pillar  = new PIXI.Graphics()
      .roundRect(-10, TOP, pillarW, BOT - TOP, 10)
      .fill({ color: COLOR_CHORD_PILLAR, alpha: 0.15 });
    container.addChild(pillar);
    container._primaryBody = pillar;

    // Finger dots from chord diagram data (matches createChordSprite)
    if (diagram && diagram.fingers) {
      for (const [strNum, fret] of diagram.fingers) {
        const sy  = S_TOP + (strNum - 1) * S_GAP;
        const dot = new PIXI.Graphics()
          .circle(0, sy, radius)
          .fill({ color: COLOR_LABEL_BG });
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

    // Chord name tag (matches createChordSprite)
    const tagBg = new PIXI.Graphics()
      .roundRect(-28, S_TOP - 38, 56, 20, 6)
      .fill({ color: COLOR_LABEL_BG, alpha: 0.9 });
    const tag = new PIXI.Text({
      text: chordName,
      style: { fontFamily: 'monospace', fontSize: 13, fill: 0xffffff, fontWeight: 'bold' },
    });
    tag.anchor.set(0.5);
    tag.x = 0;
    tag.y = S_TOP - 27;
    container.addChild(tagBg);
    container.addChild(tag);

    container._chordName = chordName;
    container._isChord   = true;

  } else {
    return null;
  }

  return { container, event, isHeld };
}

// ─────────────────────────────────────────────────────────────────────────────
// BeatClock
// Wall-clock beat tracker. Converts elapsed real time to a beat position using
// the song's BPM. Pass getCurrentBeat() into SongManager.update() each frame.
// ─────────────────────────────────────────────────────────────────────────────
export class BeatClock {
  /**
   * @param {number} bpm  – beats per minute of the song
   */
  constructor(bpm) {
    this.bpm        = bpm;
    this._running   = false;
    this._startTime = 0;
    this._startBeat = 0;
  }

  /** Start (or resume) playback from the given beat position. */
  start(fromBeat = 0) {
    this._startBeat = fromBeat;
    this._startTime = performance.now();
    this._running   = true;
  }

  /** Pause the clock, preserving the current beat position. */
  pause() {
    if (this._running) {
      this._startBeat = this.getCurrentBeat();
      this._running   = false;
    }
  }

  /** Reset to beat 0 without starting. */
  reset() {
    this._startBeat = 0;
    this._running   = false;
  }

  /** @returns {number} current song beat (float) */
  getCurrentBeat() {
    if (!this._running) return this._startBeat;
    const elapsedSec = (performance.now() - this._startTime) / 1000;
    return this._startBeat + elapsedSec * (this.bpm / 60);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SongManager
// Manages the full lifecycle of a song timeline on a PixiJS stage.
//
// Core formula:  pill.x = HIT_X + (event.beat - currentBeat) * SCROLL_SPEED
//   • When event.beat == currentBeat          → pill.x = HIT_X   (hit zone)
//   • When event.beat == currentBeat + LEAD_BEATS → pill.x = SPAWN_X (just spawned)
//
// ─────────────────────────────────────────────────────────────────────────────
export class SongManager {
  /**
   * @param {{ bpm: number, timeline: Array<{beat:number, type:string, value:any, duration:number}> }} songPayload
   * @param {PIXI.Container} stage    – PixiJS stage (or any container) to add pills to
   * @param {{ displayMode?: string, hitGateLeft?: number, hitGateRight?: number }} options – 'note' (default) | 'fret'
   */
  constructor(songPayload, stage, options = {}) {
    const { bpm, timeline } = songPayload;
    this.displayMode = options.displayMode || 'note';
    this.hitGateLeft = options.hitGateLeft || null;
    this.hitGateRight = options.hitGateRight || null;
    this.bpm         = bpm;
    // Sort ascending by beat so the spawn index walk is valid
    this.timeline    = [...timeline].sort((a, b) => a.beat - b.beat);
    this.stage       = stage;
    this.activePills     = []; // Array<{ container, event, isHeld, resonanceActive }>
    this.spawnIndex      = 0;  // next timeline index to consider spawning
    this._boardLayer     = null;
    this._resonanceGlow  = null; // PIXI.Graphics for pillar bloom halo
    this._resonanceRings = [];   // expanding ring particle list
    this._resonanceFrame = 0;    // frame counter used to throttle ring spawning
  }

  // ── Draw fretboard strings + string labels + cyan hit-zone pillar ──────────
  // Call once after the PIXI app is initialised, before starting the ticker.
  drawBoard() {
    const board = new PIXI.Graphics();
    STRINGS_FREQ.forEach((_, i) => {
      board
        .moveTo(0, S_TOP + i * S_GAP)
        .lineTo(CANVAS_W, S_TOP + i * S_GAP)
        .stroke({ width: 2, color: COLOR_STRING });
    });
    this.stage.addChild(board);

    // String number + open-note labels on the left
    STRINGS_FREQ.forEach((strData, i) => {
      const noteName  = strData.note.replace(/\d/, '');
      const stringNum = i + 1;
      const y         = S_TOP + i * S_GAP;

      const bg = new PIXI.Graphics()
        .roundRect(30, y - 16, 56, 32, 16)
        .fill({ color: 0x1a1a1a, alpha: 0.85 });
      this.stage.addChild(bg);

      const numTxt = new PIXI.Text({
        text: stringNum,
        style: { fontFamily: 'monospace', fontSize: 18, fill: 0x9f86ff, fontWeight: '900' },
      });
      numTxt.anchor.set(0.5);
      numTxt.x = 48;
      numTxt.y = y;
      this.stage.addChild(numTxt);

      const noteTxt = new PIXI.Text({
        text: noteName,
        style: { fontFamily: 'monospace', fontSize: 12, fill: 0xb8b8b8, fontWeight: 'bold' },
      });
      noteTxt.anchor.set(0.5);
      noteTxt.x = 68;
      noteTxt.y = y;
      this.stage.addChild(noteTxt);
    });

    // Cyan hit-zone pillar (matches HIT_X = 136 in existing engine)
    const pillar = new PIXI.Graphics()
      .rect(133, 0, 6, CANVAS_H)
      .fill({ color: COLOR_HIT_TINT });
    this.stage.addChild(pillar);

    // Semi-transparent hit gate window (if provided)
    if (this.hitGateLeft !== null && this.hitGateRight !== null) {
      const gateWidth = this.hitGateRight - this.hitGateLeft;
      const hitGateOverlay = new PIXI.Graphics()
        .rect(this.hitGateLeft, 0, gateWidth, CANVAS_H)
        .fill({ color: COLOR_HIT_TINT, alpha: 0.08 });
      this.stage.addChild(hitGateOverlay);
    }

    // Resonance halo layer — drawn on top of the pillar, cleared and redrawn every frame
    this._resonanceGlow = new PIXI.Graphics();
    this.stage.addChild(this._resonanceGlow);

    this._boardLayer = board;
  }

  // ── Spawn pills that have entered the visible look-ahead window ─────────────
  _spawnUpcoming(currentBeat) {
    while (this.spawnIndex < this.timeline.length) {
      const event = this.timeline[this.spawnIndex];

      // Events further than LEAD_BEATS + buffer ahead are not yet visible — stop.
      if (event.beat > currentBeat + LEAD_BEATS + 0.5) break;

      // Skip events that already passed (e.g. after a seek forward).
      if (event.beat < currentBeat - 2) {
        this.spawnIndex++;
        continue;
      }

      const pill = renderPill(event, this.displayMode);
      if (pill) {
        // Position at the correct x for the current beat before adding to stage
        pill.container.x = HIT_X + (event.beat - currentBeat) * SCROLL_SPEED;
        pill.container.y = 0;
        this.stage.addChild(pill.container);
        this.activePills.push(pill);
      }
      this.spawnIndex++;
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  /**
   * Call this every PixiJS Ticker frame. It:
   *   1. Spawns any pills that just entered the visible window.
   *   2. Repositions all active pills using beat-based x formula.
   *   3. Highlight pills inside the hit zone.
   *   4. Removes pills that have scrolled off the left edge.
   *
   * @param {number} currentBeat – the song's current beat position (from BeatClock)
   */
  update(currentBeat) {
    this._spawnUpcoming(currentBeat);

    let anyResonating = false;
    const t = performance.now() / 1000; // wall-clock seconds for sine animation

    for (let i = this.activePills.length - 1; i >= 0; i--) {
      const pill = this.activePills[i];
      const { container, event, isHeld } = pill;

      // ── Reposition using the core formula ──────────────────────────────────
      const x = HIT_X + (event.beat - currentBeat) * SCROLL_SPEED;
      container.x = x;

      // ── Resonance Active window ─────────────────────────────────────────────
      // A hold note is "resonating" when the play head is inside its beat span.
      // pill.resonanceActive is the public flag — callers can read it to trigger
      // external effects (e.g. score multipliers, UI feedback).
      const isResonating = isHeld &&
        currentBeat >= event.beat &&
        currentBeat <= event.beat + event.duration;

      pill.resonanceActive = isResonating;

      if (isResonating) {
        anyResonating = true;
        if (container._glowGraphic) {
          container._glowGraphic.visible = true;
          // Pulse alpha between 0.15 and 0.50 at ~4 Hz
          container._glowGraphic.alpha = 0.15 + 0.35 * Math.abs(Math.sin(t * 4));
        }
      } else {
        if (container._glowGraphic) container._glowGraphic.visible = false;
      }

      // ── Hit-zone highlight ─────────────────────────────────────────────────
      const inHitZone = x > HIT_X - 30 && x < HIT_X + 50;
      // Use stored _primaryBody reference so child-order changes never break tinting
      const primary = container._primaryBody || container.children[0];
      if (primary) primary.tint = inHitZone ? COLOR_HIT_TINT : 0xffffff;

      // ── Cleanup ────────────────────────────────────────────────────────────
      // For hold notes: keep until the tail passes off the left edge.
      // For tap notes: the "tail" is just x itself (small circle).
      const tailX = isHeld ? x + event.duration * SCROLL_SPEED : x;
      if (tailX < -80) {
        this.stage.removeChild(container);
        this.activePills.splice(i, 1);
      }
    }

    this._updateResonance(anyResonating, t);
  }

  // ── Pillar bloom + expanding ring particles (active during hold notes) ───────
  _updateResonance(anyResonating, t) {
    const g = this._resonanceGlow;
    if (!g) return;

    g.clear();
    this._tickRings(); // always advance rings so they finish fading even after release

    if (!anyResonating) return;

    // ── Layered concentric halos around the cyan pillar ───────────────────
    const pulse = 0.5 + 0.5 * Math.abs(Math.sin(t * 5)); // 0..1 at ~5 Hz

    // Outer soft elliptical glow
    g.ellipse(HIT_X, CANVAS_H / 2, 30 + pulse * 14, CANVAS_H * 0.72)
      .fill({ color: COLOR_RESONANCE_GLOW, alpha: 0.04 + pulse * 0.05 });

    // Mid glow
    g.ellipse(HIT_X, CANVAS_H / 2, 16 + pulse * 7, CANVAS_H * 0.55)
      .fill({ color: COLOR_RESONANCE_GLOW, alpha: 0.07 + pulse * 0.09 });

    // Inner bright column (slightly wider than the base pillar)
    g.rect(130, 0, 12, CANVAS_H)
      .fill({ color: COLOR_RESONANCE_GLOW, alpha: 0.10 + pulse * 0.22 });

    // ── Spawn a new ring particle every 12 frames ─────────────────────────
    this._resonanceFrame++;
    if (this._resonanceFrame % 12 === 0) {
      const ring = new PIXI.Graphics();
      this.stage.addChild(ring);
      this._resonanceRings.push({ g: ring, age: 0, maxAge: 45 });
    }
  }

  // ── Advance and draw each ring particle; remove expired ones ─────────────
  _tickRings() {
    for (let i = this._resonanceRings.length - 1; i >= 0; i--) {
      const r = this._resonanceRings[i];
      r.age++;
      const progress = r.age / r.maxAge;
      const radius   = 8 + progress * 64;   // expands 8 → 72 px
      const alpha    = (1 - progress) * 0.6; // fades to 0

      if (r.age >= r.maxAge) {
        this.stage.removeChild(r.g);
        r.g.destroy();
        this._resonanceRings.splice(i, 1);
      } else {
        r.g.clear();
        r.g.circle(HIT_X, CANVAS_H / 2, radius)
          .stroke({ width: 2.5, color: COLOR_RESONANCE_RING, alpha });
      }
    }
  }

  // ── Convenience: wire this manager into a PixiJS Application's ticker ───────
  /**
   * Attaches the update loop to `app.ticker` using the provided BeatClock.
   * Returns the added ticker function so you can remove it later with
   * `app.ticker.remove(tickerFn)`.
   *
   * @param  {PIXI.Application} app
   * @param  {BeatClock}        clock
   * @returns {Function}  the ticker listener (keep a reference to detach later)
   */
  attach(app, clock) {
    const tickerFn = () => this.update(clock.getCurrentBeat());
    app.ticker.add(tickerFn);
    return tickerFn;
  }

  // ── Remove all active pills from the stage and reset spawn state ─────────
  destroy() {
    for (const { container } of this.activePills) {
      this.stage.removeChild(container);
    }
    this.activePills = [];
    this.spawnIndex  = 0;
    // Clean up resonance ring particles
    for (const r of this._resonanceRings) {
      this.stage.removeChild(r.g);
      r.g.destroy();
    }
    this._resonanceRings = [];
    if (this._resonanceGlow) {
      this.stage.removeChild(this._resonanceGlow);
      this._resonanceGlow.destroy();
      this._resonanceGlow = null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// createSongTimeline  (convenience factory)
// Initialises a PixiJS Application, draws the board, and returns a fully wired
// SongManager + BeatClock ready to play the provided song payload.
//
// @param  {HTMLElement} mountEl  – DOM element to append the canvas to
// @param  {{ bpm, timeline }}   songPayload
// @returns {Promise<{ app, manager, clock, start, pause, destroy }>}
// ─────────────────────────────────────────────────────────────────────────────
export async function createSongTimeline(mountEl, songPayload, options = {}) {
  const app = new PIXI.Application();
  await app.init({
    width:           CANVAS_W,
    height:          CANVAS_H,
    backgroundColor: COLOR_BOARD_BG,
    antialias:       true,
  });
  mountEl.appendChild(app.canvas);

  const manager = new SongManager(songPayload, app.stage, options);
  manager.drawBoard();

  const clock = new BeatClock(songPayload.bpm);
  let tickerFn = null;

  const start = (fromBeat = 0) => {
    clock.start(fromBeat);
    if (!tickerFn) tickerFn = manager.attach(app, clock);
  };

  const pause = () => {
    clock.pause();
    if (tickerFn) { app.ticker.remove(tickerFn); tickerFn = null; }
  };

  const destroy = () => {
    pause();
    manager.destroy();
    app.destroy(true, { children: true });
  };

  return { app, manager, clock, start, pause, destroy };
}

// ─────────────────────────────────────────────────────────────────────────────
// validateSongPayload
// Validates an AI-generated song payload against the timeline schema before
// handing it to SongManager. Use this at the API boundary to catch malformed
// AI output early and surface clear error messages.
//
// Valid note values : "E4", "F#3", "Bb2"  →  /^[A-G][#b]?\d$/
// Valid chord values: "Am", "Cmaj", "D7"  →  /^[A-G][#b]?(m|maj7?|7|m7|dim|aug|sus[24]|add9|6)?$/
// beat & duration   : finite numbers (beat ≥ 0, duration > 0)
//
// @param  {object} payload  – the raw JSON from the AI endpoint
// @returns {{ valid: boolean, errors: string[] }}
// ─────────────────────────────────────────────────────────────────────────────
export function validateSongPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Payload must be a non-null object.'] };
  }

  const { bpm, timeline } = payload;

  // ── bpm ───────────────────────────────────────────────────────────────────
  if (typeof bpm !== 'number' || !isFinite(bpm) || bpm <= 0) {
    errors.push(`"bpm" must be a positive finite number (got ${JSON.stringify(bpm)}).`);
  }

  // ── timeline ──────────────────────────────────────────────────────────────
  if (!Array.isArray(timeline)) {
    errors.push('"timeline" must be an array.');
    return { valid: false, errors };
  }
  if (timeline.length === 0) {
    errors.push('"timeline" must contain at least one event.');
  }

  const NOTE_RE  = /^([A-Ga-g])([#b♯♭]?)(-?\d+)$/;
  const CHORD_RE = /^[A-G][#b]?(m|maj7?|7|m7|dim|aug|sus[24]|add9|6)?$/;

  timeline.forEach((event, idx) => {
    const p = `timeline[${idx}]`;

    if (!event || typeof event !== 'object') {
      errors.push(`${p} must be an object.`);
      return;
    }

    // beat
    if (typeof event.beat !== 'number' || !isFinite(event.beat)) {
      errors.push(`${p}.beat must be a finite number (got ${JSON.stringify(event.beat)}).`);
    } else if (event.beat < 0) {
      errors.push(`${p}.beat must be >= 0 (got ${event.beat}).`);
    }

    // type
    if (event.type !== 'note' && event.type !== 'chord') {
      errors.push(`${p}.type must be "note" or "chord" (got ${JSON.stringify(event.type)}).`);
    }

    // value — validated against type
    if (event.type === 'note') {
      if (typeof event.value !== 'string' || !NOTE_RE.test(event.value.trim())) {
        errors.push(
          `${p}.value must be a note label like "E4" or "F#3" (got ${JSON.stringify(event.value)}).`
        );
      } else {
        const normalizedValue = normalizeNoteLabel(event.value);
        if (!normalizedValue) {
          errors.push(
            `${p}.value must be a valid note label like "E4" or "F#3" (got ${JSON.stringify(event.value)}).`
          );
        } else if (!resolveNoteEntry(normalizedValue)) {
          errors.push(
            `${p}.value "${event.value}" resolves to "${normalizedValue}" but is not reachable in the standard guitar note pool (check octave/range).`
          );
        }
      }
    } else if (event.type === 'chord') {
      const chordVal = Array.isArray(event.value) ? event.value[0] : event.value;
      if (typeof chordVal !== 'string' || !CHORD_RE.test(chordVal)) {
        errors.push(
          `${p}.value must be a chord label like "Am", "Cmaj", or "D7" (got ${JSON.stringify(event.value)}).`
        );
      }
    }

    // duration
    if (event.duration === undefined || event.duration === null) {
      errors.push(`${p}.duration is required.`);
    } else if (typeof event.duration !== 'number' || !isFinite(event.duration) || event.duration <= 0) {
      errors.push(
        `${p}.duration must be a positive finite number (got ${JSON.stringify(event.duration)}).`
      );
    }
  });

  // ── Beat ordering advisory ─────────────────────────────────────────────────
  // SongManager re-sorts automatically, but warn the AI so it can fix its output.
  for (let i = 1; i < timeline.length; i++) {
    if (typeof timeline[i].beat === 'number' && typeof timeline[i - 1].beat === 'number') {
      if (timeline[i].beat < timeline[i - 1].beat) {
        errors.push(
          `timeline is not sorted: event[${i}].beat (${timeline[i].beat}) < ` +
          `event[${i - 1}].beat (${timeline[i - 1].beat}). ` +
          `SongManager will re-sort automatically, but the AI output should be ordered.`
        );
        break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
