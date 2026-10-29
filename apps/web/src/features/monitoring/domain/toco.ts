//~ The trace drawn on the monitoring paper. There is no sensor: the curve is
// rebuilt from the taps, so its shape is a model —
// - a calm baseline around 10 mmHg with a little natural wobble
// - after "start", a contraction climbs through fixed landmarks: 60 mmHg at
//   10 s, 80 around 30 s, close to 100 around 50 s, and holds 100 past one
//   minute — a smooth curve through them, never overshooting
// - after "end", it comes down progressively for FALL seconds, from the
//   level it had reached
// The felt intensity is recorded but plays no part: only the taps shape the
// curve. Nothing is redrawn afterwards — the live trace and the saved one match.
import type { Timeline } from './timeline';

export const REST = 10;
export const FALL = 20;
// [seconds after "start", mmHg]
export const LANDMARKS: [number, number][] = [
  [0, REST],
  [10, 60],
  [30, 80],
  [50, 96],
  [60, 100]
];

// tangents at each landmark: flat at both ends, a weighted harmonic mean of
// the neighbouring slopes in between — the curve can't overshoot (Fritsch–Carlson)
const TANGENTS = (() => {
  const widths = LANDMARKS.slice(1).map(([x], k) => x - LANDMARKS[k][0]);
  const slopes = LANDMARKS.slice(1).map(([, y], k) => (y - LANDMARKS[k][1]) / widths[k]);
  return LANDMARKS.map((_, k) => {
    if (k === 0 || k === LANDMARKS.length - 1) return 0;
    if (slopes[k - 1] * slopes[k] <= 0) return 0;
    const w1 = 2 * widths[k] + widths[k - 1];
    const w2 = widths[k] + 2 * widths[k - 1];
    return (w1 + w2) / (w1 / slopes[k - 1] + w2 / slopes[k]);
  });
})();

// height above the rest level, `elapsed` seconds after "start"
export const contractionLevel = (elapsed: number): number => {
  const last = LANDMARKS.length - 1;
  if (elapsed <= 0) return 0;
  if (elapsed >= LANDMARKS[last][0]) return LANDMARKS[last][1] - REST;

  const k = LANDMARKS.findIndex((_, index) => index < last && elapsed < LANDMARKS[index + 1][0]);
  const [x0, y0] = LANDMARKS[k];
  const [x1, y1] = LANDMARKS[k + 1];
  const width = x1 - x0;
  const t = (elapsed - x0) / width;
  // cubic Hermite between the two landmarks
  const y =
    (2 * t ** 3 - 3 * t ** 2 + 1) * y0 +
    (t ** 3 - 2 * t ** 2 + t) * width * TANGENTS[k] +
    (-2 * t ** 3 + 3 * t ** 2) * y1 +
    (t ** 3 - t ** 2) * width * TANGENTS[k + 1];
  return y - REST;
};

// 0 → 1, flat at both ends
const smooth = (x: number): number => {
  const clamped = Math.max(0, Math.min(1, x));
  return clamped * clamped * (3 - 2 * clamped);
};

export const baseline = (t: number): number =>
  9 + 1.3 * Math.sin(t * 0.9) + 0.8 * Math.sin(t * 2.3 + 1) + 1.6 * Math.sin(t * 0.021);

// the pressure drawn at `t` seconds, between 0 and 100 mmHg
export const tocoValue = (timeline: Timeline, t: number): number => {
  let value = baseline(t);
  if (t > timeline.now) return Math.max(0, Math.min(100, value));

  for (const contraction of timeline.contractions) {
    const elapsed = t - contraction.start;
    const duration = contraction.end === null ? Infinity : contraction.end - contraction.start;
    if (elapsed < 0 || elapsed > duration + FALL) continue;

    const fall = elapsed <= duration ? 1 : 1 - smooth((elapsed - duration) / FALL);
    value += contractionLevel(Math.min(elapsed, duration)) * fall * (1 + 0.02 * Math.sin(t * 1.7));
  }

  return Math.max(0, Math.min(100, value));
};
