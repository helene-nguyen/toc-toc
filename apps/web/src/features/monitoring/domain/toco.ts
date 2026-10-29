//~ The trace drawn on the monitoring paper. There is no sensor: the curve is
// rebuilt from the taps, so its shape is a model —
// - a calm baseline around 10 mmHg with a little natural wobble
// - after "start", a contraction climbs through fixed landmarks: 30 mmHg at
//   10 s, 45 at 20 s, 60 at 30 s, 80 at 45 s, 90 at 1 min, 100 from 1 min 30
//   — a smooth curve through them, never overshooting. They follow the usual
//   figures: about 45 s and 50–80 mmHg in active labour, up to 90 s and
//   75–100 mmHg in transition, over a resting tone around 10 mmHg
// - after "end", it comes down at the pace it went up: the same path in
//   reverse, from the level it had reached — a 20 s contraction takes 20 s
//   to settle, one that reached 100 takes the full 1 min 30
// - a painless (Braxton-Hicks) contraction has the same timing, scaled down
//   to peak at BRAXTON_HICKS_TOP
// The felt intensity is recorded but plays no part: only the taps shape the
// curve. Nothing is redrawn afterwards — the live trace and the saved one match.
import type { Timeline } from './timeline';

export const REST = 10;
export const BRAXTON_HICKS_TOP = 30;
// [seconds after "start", mmHg]
export const LANDMARKS: [number, number][] = [
  [0, REST],
  [10, 30],
  [20, 45],
  [30, 60],
  [45, 80],
  [60, 90],
  [90, 100]
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

// seconds from rest to the top; past it the curve holds
export const FULL_CLIMB = LANDMARKS[LANDMARKS.length - 1][0];

// the full climb (rest → 100) brought down to rest → BRAXTON_HICKS_TOP
const BRAXTON_HICKS_SCALE = (BRAXTON_HICKS_TOP - REST) / (LANDMARKS[LANDMARKS.length - 1][1] - REST);

export const baseline = (t: number): number =>
  9 + 1.3 * Math.sin(t * 0.9) + 0.8 * Math.sin(t * 2.3 + 1) + 1.6 * Math.sin(t * 0.021);

// the pressure drawn at `t` seconds, between 0 and 100 mmHg
export const tocoValue = (timeline: Timeline, t: number): number => {
  let value = baseline(t);
  if (t > timeline.now) return Math.max(0, Math.min(100, value));

  for (const contraction of timeline.contractions) {
    const elapsed = t - contraction.start;
    const duration = contraction.end === null ? Infinity : contraction.end - contraction.start;
    // the way down replays the way up, so it lasts as long as the climb did
    const climbed = Math.min(duration, FULL_CLIMB);
    if (elapsed < 0 || elapsed > duration + climbed) continue;

    const level =
      elapsed <= duration ? contractionLevel(elapsed) : contractionLevel(climbed - (elapsed - duration));
    const scale = contraction.braxtonHicks ? BRAXTON_HICKS_SCALE : 1;
    value += level * scale * (1 + 0.02 * Math.sin(t * 1.7));
  }

  return Math.max(0, Math.min(100, value));
};
