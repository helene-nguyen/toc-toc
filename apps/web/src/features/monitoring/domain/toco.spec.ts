import { describe, expect, it } from 'vitest';
import { AMPLITUDE, FALL, RISE, baseline, tocoValue } from './toco';
import type { Timeline } from './timeline';

const timeline = (overrides: Partial<Timeline> = {}): Timeline => ({
  now: 600,
  running: true,
  contractions: [{ start: 100, end: 160, intensity: 2 }],
  movements: [],
  ...overrides
});

describe('tocoValue', () => {
  it('stays on the baseline outside contractions', () => {
    expect(tocoValue(timeline(), 50)).toBeCloseTo(baseline(50));
    expect(tocoValue(timeline(), 160 + FALL + 1)).toBeCloseTo(baseline(160 + FALL + 1));
  });

  it(`rises progressively over ${RISE} s after the start`, () => {
    const early = tocoValue(timeline(), 103) - baseline(103);
    const later = tocoValue(timeline(), 110) - baseline(110);
    const top = tocoValue(timeline(), 100 + RISE) - baseline(100 + RISE);

    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(later);
    expect(later).toBeLessThan(top);
  });

  it('reaches a higher peak for a stronger contraction', () => {
    const peak = (intensity: 1 | 2 | 3) =>
      tocoValue(timeline({ contractions: [{ start: 100, end: 160, intensity }] }), 140) - baseline(140);

    expect(peak(1)).toBeLessThan(peak(2));
    expect(peak(2)).toBeLessThan(peak(3));
    expect(peak(3)).toBeLessThanOrEqual(AMPLITUDE[3] * 1.05);
  });

  it(`comes down progressively over ${FALL} s after the end`, () => {
    const atEnd = tocoValue(timeline(), 160) - baseline(160);
    const halfway = tocoValue(timeline(), 160 + FALL / 2) - baseline(160 + FALL / 2);

    expect(halfway).toBeGreaterThan(0);
    expect(halfway).toBeLessThan(atEnd);
  });

  it('keeps rising for a contraction still going on, and draws nothing after now', () => {
    const live = timeline({ now: 130, contractions: [{ start: 100, end: null, intensity: 2 }] });

    expect(tocoValue(live, 125) - baseline(125)).toBeGreaterThan(40);
    expect(tocoValue(live, 200)).toBeCloseTo(baseline(200));
  });

  it('stays between 0 and 100 mmHg', () => {
    const strong = timeline({ contractions: [{ start: 0, end: 120, intensity: 3 }] });

    for (let t = 0; t < 200; t += 5) {
      expect(tocoValue(strong, t)).toBeGreaterThanOrEqual(0);
      expect(tocoValue(strong, t)).toBeLessThanOrEqual(100);
    }
  });
});
