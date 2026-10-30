import { describe, expect, it } from 'vitest';
import { CLIMB_TIME, CURVE_CAP, FULL_CLIMB, REST, baseline, contractionLevel, tocoValue } from './toco';
import type { Timeline } from './timeline';

// the trace wobbles by a couple of mmHg (and is capped at 100): compare loosely
const expectNear = (actual: number, expected: number) => expect(Math.abs(actual - expected)).toBeLessThan(2.5);

const timeline = (overrides: Partial<Timeline> = {}): Timeline => ({
  now: 600,
  running: true,
  contractions: [{ start: 100, end: 160, intensity: 2, braxtonHicks: false, curve: 'auto' }],
  movements: [],
  ...overrides
});

describe('contractionLevel', () => {
  it('climbs through the landmarks: 30 mmHg at 10 s, 45 at 20 s, 60 at 30 s, 80 at 45 s, 90 at 1 min, 100 at 1 min 30', () => {
    expect(contractionLevel(0)).toBe(0);
    expect(contractionLevel(10) + REST).toBeCloseTo(30);
    expect(contractionLevel(20) + REST).toBeCloseTo(45);
    expect(contractionLevel(30) + REST).toBeCloseTo(60);
    expect(contractionLevel(45) + REST).toBeCloseTo(80);
    expect(contractionLevel(60) + REST).toBeCloseTo(90);
    expect(contractionLevel(80) + REST).toBeLessThan(100);
    expect(contractionLevel(90) + REST).toBeCloseTo(100);
    expect(contractionLevel(240) + REST).toBeCloseTo(100);
  });

  it('only ever goes up, smoothly, without overshooting 100', () => {
    let previous = 0;
    for (let elapsed = 0.5; elapsed <= 180; elapsed += 0.5) {
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
    // 100 → 160: a minute up, so a minute down
    expect(tocoValue(timeline(), 50)).toBeCloseTo(baseline(50));
    expect(tocoValue(timeline(), 160 + 60 + 1)).toBeCloseTo(baseline(160 + 60 + 1));
  });

  it('draws the same curve whatever the felt intensity', () => {
    const light = timeline({ contractions: [{ start: 100, end: 160, intensity: 1, braxtonHicks: false, curve: 'auto' }] });
    const strong = timeline({ contractions: [{ start: 100, end: 160, intensity: 3, braxtonHicks: false, curve: 'auto' }] });

    for (const t of [105, 120, 150, 165]) expect(tocoValue(light, t)).toBe(tocoValue(strong, t));
  });

  it('comes down at the pace it went up: the climb replayed backwards', () => {
    // a 20 s contraction stops around 45 mmHg and takes 20 s to settle
    const short = timeline({ contractions: [{ start: 100, end: 120, intensity: 2, braxtonHicks: false, curve: 'auto' }] });
    const above = (t: number) => tocoValue(short, t) - baseline(t);

    expectNear(above(120) + REST, 45);
    // 10 s after the end, where it was 10 s after the start
    expect(Math.abs(above(130) - above(110))).toBeLessThan(1);
    expectNear(above(130) + REST, 30);
    expect(tocoValue(short, 141)).toBeCloseTo(baseline(141));
  });

  it(`takes the full ${FULL_CLIMB} s to come down from 100`, () => {
    const long = timeline({ contractions: [{ start: 100, end: 280, intensity: 2, braxtonHicks: false, curve: 'auto' }] });
    const above = (t: number) => tocoValue(long, t) - baseline(t);

    expectNear(above(280) + REST, 100);
    // 30 s after the end = the 1 min point of the climb
    expectNear(above(280 + 30) + REST, 90);
    // 60 s after the end = the 30 s point of the climb
    expectNear(above(280 + 60) + REST, 60);
    expect(tocoValue(long, 280 + FULL_CLIMB + 1)).toBeCloseTo(baseline(280 + FULL_CLIMB + 1));
  });

  it('keeps climbing for a contraction still going on, and draws nothing after now', () => {
    const live = timeline({ now: 130, contractions: [{ start: 100, end: null, intensity: 2, braxtonHicks: false, curve: 'auto' }] });

    expect(tocoValue(live, 125) - baseline(125) + REST).toBeGreaterThan(48);
    expect(tocoValue(live, 200)).toBeCloseTo(baseline(200));
  });

  it('caps the trace at the intensity chosen: low 30, medium 60, high 80 mmHg — same climb up to there', () => {
    for (const curve of ['low', 'medium', 'high'] as const) {
      const capped = timeline({ contractions: [{ start: 100, end: 300, intensity: 2, braxtonHicks: false, curve }] });
      const auto = timeline({ contractions: [{ start: 100, end: 300, intensity: 2, braxtonHicks: false, curve: 'auto' }] });
      const above = (tl: Timeline, t: number) => tocoValue(tl, t) - baseline(t);

      // the start is the same climb
      expect(above(capped, 103)).toBeCloseTo(above(auto, 103));
      // then it holds at the cap
      expectNear(above(capped, 250) + REST, CURVE_CAP[curve]);
      // after "end" it comes down at once, no lingering at the cap
      expect(above(capped, 300 + CLIMB_TIME[curve] / 2) + REST).toBeLessThan(CURVE_CAP[curve] - 5);
      // back to rest as fast as it climbed to the cap
      expect(tocoValue(capped, 300 + CLIMB_TIME[curve] + 1)).toBeCloseTo(baseline(300 + CLIMB_TIME[curve] + 1));
    }
  });

  it('climbs to each cap at the auto pace: 30 mmHg in 10 s, 60 in 30 s, 80 in 45 s', () => {
    expect(CLIMB_TIME.low).toBeCloseTo(10, 1);
    expect(CLIMB_TIME.medium).toBeCloseTo(30, 1);
    expect(CLIMB_TIME.high).toBeCloseTo(45, 1);
    expect(CLIMB_TIME.auto).toBe(FULL_CLIMB);
  });

  it('draws a painless (Braxton-Hicks) contraction like any other: the pain plays no part', () => {
    const painless = timeline({ contractions: [{ start: 100, end: 160, intensity: 1, braxtonHicks: true, curve: 'auto' }] });

    for (const t of [105, 130, 170]) expect(tocoValue(painless, t)).toBe(tocoValue(timeline(), t));
  });

  it('stays between 0 and 100 mmHg', () => {
    const long = timeline({ contractions: [{ start: 0, end: 200, intensity: 3, braxtonHicks: false, curve: 'auto' }] });

    for (let t = 0; t < 350; t += 5) {
      expect(tocoValue(long, t)).toBeGreaterThanOrEqual(0);
      expect(tocoValue(long, t)).toBeLessThanOrEqual(100);
    }
  });
});
