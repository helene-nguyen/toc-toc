//~ The trace drawn on the monitoring paper. There is no sensor: the curve is
// rebuilt from the taps, so its shape is a model —
// - a calm baseline around 10 mmHg with a little natural wobble
// - each contraction rises progressively for RISE seconds after "start",
//   rounds up to its peak (higher for a stronger felt intensity), and comes
//   down progressively for FALL seconds after "end"
// Nothing is redrawn afterwards: the live trace and the saved one match.
import type { Intensity } from '../monitoringTypes';
import type { Timeline } from './timeline';

export const RISE = 15;
export const FALL = 15;
// peak height above the baseline, in mmHg, per felt intensity
export const AMPLITUDE: Record<Intensity, number> = { 1: 34, 2: 55, 3: 80 };

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

    const rise = smooth(elapsed / RISE);
    const fall = elapsed <= duration ? 1 : 1 - smooth((elapsed - duration) / FALL);
    const dome = 0.82 + 0.18 * smooth(elapsed / 35);
    value += AMPLITUDE[contraction.intensity] * (1 + 0.04 * Math.sin(t * 1.7)) * rise * fall * dome;
  }

  return Math.max(0, Math.min(100, value));
};
