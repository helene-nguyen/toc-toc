import { describe, expect, it } from 'vitest';
import { FALL, REST, baseline, contractionLevel, tocoValue } from './toco';
import type { Timeline } from './timeline';

const timeline = (overrides: Partial<Timeline> = {}): Timeline => ({
  now: 600,
  running: true,
  contractions: [{ start: 100, end: 160, intensity: 2 }],
  movements: [],
  ...overrides
});

describe('contractionLevel', () => {
  it('climbs through the landmarks: 60 mmHg at 10 s, 80 at 30 s, ~96 at 50 s, 100 past a minute', () => {
    expect(contractionLevel(0)).toBe(0);
    expect(contractionLevel(10) + REST).toBeCloseTo(60);
    expect(contractionLevel(30) + REST).toBeCloseTo(80);
    expect(contractionLevel(50) + REST).toBeCloseTo(96);
    expect(contractionLevel(60) + REST).toBeCloseTo(100);
    expect(contractionLevel(180) + REST).toBeCloseTo(100);
  });

  it('only ever goes up, smoothly, without overshooting 100', () => {
    let previous = 0;
    for (let elapsed = 0.5; elapsed <= 90; elapsed += 0.5) {
      const level = contractionLevel(elapsed);
      expect(level).toBeGreaterThanOrEqual(previous);
      expect(level + REST).toBeLessThanOrEqual(100);
      // no jump: at most 5 mmHg in half a second
      expect(level - previous).toBeLessThan(5);
      previous = level;
    }
  });
});

describe('tocoValue', () => {
  it('stays on the baseline outside contractions', () => {
    expect(tocoValue(timeline(), 50)).toBeCloseTo(baseline(50));
    expect(tocoValue(timeline(), 160 + FALL + 1)).toBeCloseTo(baseline(160 + FALL + 1));
  });

  it('draws the same curve whatever the felt intensity', () => {
    const light = timeline({ contractions: [{ start: 100, end: 160, intensity: 1 }] });
    const strong = timeline({ contractions: [{ start: 100, end: 160, intensity: 3 }] });

    for (const t of [105, 120, 150, 165]) expect(tocoValue(light, t)).toBe(tocoValue(strong, t));
  });

  it(`comes down progressively over ${FALL} s from the level reached`, () => {
    // a 20 s contraction stops around 72 mmHg, short of the 80 of a longer one
    const short = timeline({ contractions: [{ start: 100, end: 120, intensity: 2 }] });
    const atEnd = tocoValue(short, 120) - baseline(120);
    const halfway = tocoValue(short, 120 + FALL / 2) - baseline(120 + FALL / 2);

    expect(atEnd + REST).toBeGreaterThan(68);
    expect(atEnd + REST).toBeLessThan(76);
    expect(halfway).toBeGreaterThan(0);
    expect(halfway).toBeLessThan(atEnd);
  });

  it('keeps climbing for a contraction still going on, and draws nothing after now', () => {
    const live = timeline({ now: 130, contractions: [{ start: 100, end: null, intensity: 2 }] });

    expect(tocoValue(live, 125) - baseline(125)).toBeGreaterThan(60);
    expect(tocoValue(live, 200)).toBeCloseTo(baseline(200));
  });

  it('stays between 0 and 100 mmHg', () => {
    const long = timeline({ contractions: [{ start: 0, end: 150, intensity: 3 }] });

    for (let t = 0; t < 200; t += 5) {
      expect(tocoValue(long, t)).toBeGreaterThanOrEqual(0);
      expect(tocoValue(long, t)).toBeLessThanOrEqual(100);
    }
  });
});
