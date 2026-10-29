import { describe, expect, it } from 'vitest';
import { fiveOneOne, rhythm } from './stats';
import type { Timeline, TimelineContraction } from './timeline';

// one contraction every `every` seconds from `from`, each lasting `lasting`
const regular = (count: number, every: number, lasting: number, from = 60): TimelineContraction[] =>
  Array.from({ length: count }, (_, index) => ({
    start: from + index * every,
    end: from + index * every + lasting,
    intensity: 2 as const
  }));

describe('rhythm', () => {
  it('measures the recent rhythm', () => {
    const timeline: Timeline = {
      now: 3000,
      running: true,
      contractions: regular(10, 300, 50),
      movements: [100, 2500, 2900]
    };

    expect(rhythm(timeline)).toEqual({
      perTenMinutes: 2,
      averageInterval: 300,
      averageDuration: 50,
      sinceLast: 3000 - (60 + 9 * 300),
      movementsLastHour: 3,
      sinceLastMovement: 100
    });
  });

  it('has nothing to say before the first taps', () => {
    expect(rhythm({ now: 120, running: true, contractions: [], movements: [] })).toEqual({
      perTenMinutes: 0,
      averageInterval: null,
      averageDuration: null,
      sinceLast: null,
      movementsLastHour: 0,
      sinceLastMovement: null
    });
  });

  it('leaves a contraction going on out of the average duration', () => {
    const contractions = [...regular(2, 300, 60), { start: 700, end: null, intensity: 2 as const }];

    expect(rhythm({ now: 720, running: true, contractions, movements: [] }).averageDuration).toBe(60);
  });
});

describe('fiveOneOne', () => {
  it('is met after an hour of contractions every 5 min lasting 1 min', () => {
    const timeline: Timeline = { now: 3900, running: true, contractions: regular(13, 290, 65), movements: [] };

    expect(fiveOneOne(timeline)).toEqual({
      everyFiveMinutes: true,
      lastingOneMinute: true,
      forOneHour: true,
      met: true
    });
  });

  it('is not met with contractions too far apart, too short, or too soon', () => {
    expect(fiveOneOne({ now: 4000, running: true, contractions: regular(8, 480, 65), movements: [] }).met).toBe(false);
    expect(fiveOneOne({ now: 4000, running: true, contractions: regular(13, 290, 45), movements: [] }).met).toBe(false);
    expect(fiveOneOne({ now: 1800, running: true, contractions: regular(6, 290, 65), movements: [] })).toMatchObject({
      everyFiveMinutes: true,
      forOneHour: false,
      met: false
    });
  });
});
