//~ Draws the monitoring paper on a canvas: rose grid, the contraction trace
// in ink blue, contractions shaded, the baby's movements in teal — either
// on a strip of their own under the trace ("split") or as marks on top of
// it ("merged"), like the event marker of a hospital monitor. Pure drawing:
// the same functions serve the screen and, later, the printed page.
import { tocoValue } from '../domain/toco';
import type { Timeline } from '../domain/timeline';
import { gridSteps } from './grid';

export type ChartMode = 'split' | 'merged';

export const PALETTE_KEYS = [
  'paper',
  'grid-minor',
  'grid-major',
  'trace',
  'contract-soft',
  'muted',
  'move',
  'move-soft'
] as const;
export type Palette = Record<(typeof PALETTE_KEYS)[number], string>;

// read from the CSS tokens, so the chart follows the light/dark theme
export const readPalette = (): Palette => {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(PALETTE_KEYS.map((key) => [key, style.getPropertyValue(`--${key}`).trim()])) as Palette;
};

// room on the left for the mmHg scale
export const GUTTER = 38;

export interface DrawOptions {
  // clock time of a moment, for the labels under the trace
  clock: (seconds: number) => string;
  // a dot at "now" while the monitoring runs
  showNow?: boolean;
}

const FONT = "10px 'JetBrains Mono', monospace";

const drawToco = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeline: Timeline,
  t0: number,
  t1: number,
  P: Palette,
  options: DrawOptions & { moves: boolean }
) => {
  const top = 16;
  const bottom = h - 20;
  const height = bottom - top;
  const pps = (w - GUTTER) / (t1 - t0);
  const X = (t: number) => GUTTER + (t - t0) * pps;
  const Y = (value: number) => bottom - (value / 100) * height;

  ctx.fillStyle = P.paper;
  ctx.fillRect(0, 0, w, h);

  // contractions shaded from "start" to "end" — fainter for a painless one
  ctx.fillStyle = P['contract-soft'];
  for (const contraction of timeline.contractions) {
    const end = contraction.end ?? timeline.now;
    if (end < t0 || contraction.start > t1) continue;
    const x0 = Math.max(GUTTER, X(contraction.start));
    ctx.globalAlpha = contraction.braxtonHicks ? 0.4 : 1;
    ctx.fillRect(x0, top, Math.min(w, X(end)) - x0, height);
  }
  ctx.globalAlpha = 1;

  // time grid
  const grid = gridSteps(pps);
  for (let s = Math.ceil(t0 / grid.minor) * grid.minor; s <= t1; s += grid.minor) {
    const x = Math.round(X(s)) + 0.5;
    if (x < GUTTER) continue;
    ctx.strokeStyle = s % grid.major === 0 ? P['grid-major'] : P['grid-minor'];
    ctx.lineWidth = s % grid.strong === 0 ? 1.6 : 1;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    // a label too close to an edge would be cut: leave it out
    if (s % grid.label === 0 && x > GUTTER + 16 && x < w - 16) {
      ctx.fillStyle = P.muted;
      ctx.font = FONT;
      ctx.textAlign = 'center';
      ctx.fillText(options.clock(s), x, h - 6);
    }
  }
  // pressure grid: a line every 10 mmHg, darker every 20
  for (let value = 0; value <= 100; value += 10) {
    const y = Math.round(Y(value)) + 0.5;
    ctx.strokeStyle = value % 20 === 0 ? P['grid-major'] : P['grid-minor'];
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(GUTTER, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // the trace, one point per pixel, up to now
  const end = Math.min(t1, timeline.now);
  if (end > t0) {
    ctx.strokeStyle = P.trace;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let x = GUTTER; x <= X(end); x += 1) {
      const y = Y(tocoValue(timeline, t0 + (x - GUTTER) / pps));
      if (x === GUTTER) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  if (options.moves) {
    ctx.fillStyle = P.move;
    ctx.strokeStyle = P.move;
    ctx.lineWidth = 1;
    for (const at of timeline.movements) {
      if (at < t0 || at > t1 || at > timeline.now) continue;
      const x = X(at);
      ctx.globalAlpha = 0.35;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, top + 7);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(x - 4.5, top);
      ctx.lineTo(x + 4.5, top);
      ctx.lineTo(x, top + 7);
      ctx.closePath();
      ctx.fill();
    }
  }

  if (options.showNow && timeline.running && timeline.now >= t0 && timeline.now <= t1) {
    ctx.fillStyle = P.trace;
    ctx.beginPath();
    ctx.arc(X(timeline.now), Y(tocoValue(timeline, timeline.now)), 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // the mmHg scale, drawn last so the trace slides under it
  ctx.fillStyle = P.paper;
  ctx.fillRect(0, 0, GUTTER - 1, h);
  ctx.strokeStyle = P['grid-major'];
  ctx.beginPath();
  ctx.moveTo(GUTTER - 0.5, top);
  ctx.lineTo(GUTTER - 0.5, bottom);
  ctx.stroke();
  ctx.fillStyle = P.muted;
  ctx.font = FONT;
  ctx.textAlign = 'right';
  for (let value = 0; value <= 100; value += 20) ctx.fillText(String(value), GUTTER - 6, Y(value) + 3);
  ctx.textAlign = 'left';
  ctx.fillText('mmHg', 4, 10);
};

//~ The movement strip: a stroke per movement, and the count per 10 minutes behind
const drawMovements = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeline: Timeline,
  t0: number,
  t1: number,
  P: Palette
) => {
  const top = 4;
  const bottom = h - 4;
  const height = bottom - top;
  const pps = (w - GUTTER) / (t1 - t0);
  const X = (t: number) => GUTTER + (t - t0) * pps;

  ctx.fillStyle = P.paper;
  ctx.fillRect(0, 0, w, h);

  const grid = gridSteps(pps);
  const step = Math.max(60, grid.minor);
  for (let s = Math.ceil(t0 / step) * step; s <= t1; s += step) {
    const x = Math.round(X(s)) + 0.5;
    if (x < GUTTER) continue;
    ctx.strokeStyle = s % grid.major === 0 ? P['grid-major'] : P['grid-minor'];
    ctx.lineWidth = s % grid.strong === 0 ? 1.6 : 1;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  }

  const movements = timeline.movements.filter((at) => at <= timeline.now);
  for (let bucket = Math.floor(t0 / 600) * 600; bucket < t1 && bucket <= timeline.now; bucket += 600) {
    const count = movements.filter((at) => at >= bucket && at < bucket + 600).length;
    if (!count) continue;
    const x0 = Math.max(GUTTER, X(bucket));
    const x1 = Math.min(w, X(Math.min(bucket + 600, timeline.now)));
    if (x1 <= x0) continue;
    const barHeight = Math.min(count / 8, 1) * height;
    ctx.fillStyle = P['move-soft'];
    ctx.fillRect(x0, bottom - barHeight, x1 - x0, barHeight);
    if (x1 - x0 > 26) {
      ctx.fillStyle = P.move;
      ctx.font = `600 ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(String(count), x0 + 4, top + 11);
    }
  }

  ctx.strokeStyle = P.move;
  ctx.lineWidth = pps * 60 < 8 ? 1 : 2;
  for (const at of movements) {
    if (at < t0 || at > t1) continue;
    const x = X(at);
    ctx.beginPath();
    ctx.moveTo(x, bottom);
    ctx.lineTo(x, bottom - height * 0.55);
    ctx.stroke();
  }

  ctx.fillStyle = P.paper;
  ctx.fillRect(0, 0, GUTTER - 1, h);
  ctx.strokeStyle = P['grid-major'];
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(GUTTER - 0.5, top);
  ctx.lineTo(GUTTER - 0.5, bottom);
  ctx.moveTo(GUTTER, bottom + 0.5);
  ctx.lineTo(w, bottom + 0.5);
  ctx.stroke();
  ctx.font = FONT;
  ctx.textAlign = 'left';
  ctx.fillStyle = P.move;
  ctx.fillText('Mvts', 4, top + 11);
  ctx.fillStyle = P.muted;
  ctx.fillText("/10'", 4, top + 24);
};

//~ The whole chart for the time window [t0, t1] (seconds since the start)
export const drawChart = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeline: Timeline,
  t0: number,
  t1: number,
  P: Palette,
  mode: ChartMode,
  options: DrawOptions
) => {
  if (mode === 'merged') {
    drawToco(ctx, w, h, timeline, t0, t1, P, { ...options, moves: true });
    return;
  }
  const strip = Math.max(50, Math.round(h * 0.24));
  ctx.fillStyle = P.paper;
  ctx.fillRect(0, 0, w, h);
  drawToco(ctx, w, h - strip - 4, timeline, t0, t1, P, { ...options, moves: false });
  ctx.save();
  ctx.translate(0, h - strip);
  drawMovements(ctx, w, strip, timeline, t0, t1, P);
  ctx.restore();
};
