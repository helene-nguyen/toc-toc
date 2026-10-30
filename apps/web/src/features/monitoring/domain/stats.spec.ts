import { describe, expect, it } from 'vitest';
import { fiveOneOne, rhythm, sessionSummary } from './stats';
import type { Timeline, TimelineContraction } from './timeline';

// one contraction every `every` seconds from `from`, each lasting `lasting`
const regular = (count: number, every: number, lasting: number, from = 60): TimelineContraction[] =>
  Array.from({ length: count }, (_, index) => ({
    start: from + index * every,
    end: from + index * every + lasting,
    intensity: 2 as const, braxtonHicks: false, curve: 'auto' as const
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
    const contractions = [...regular(2, 300, 60), { start: 700, end: null, intensity: 2 as const, braxtonHicks: false, curve: 'auto' as const }];

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

describe('sessionSummary', () => {
  it('sums up a whole session', () => {
    const timeline: Timeline = {
      now: 7200,
      running: false,
      contractions: regular(4, 600, 50),
      movements: [100, 200, 300, 4000]
    };

    expect(sessionSummary(timeline)).toEqual({
      duration: 7200,
      contractionCount: 4,
      braxtonHicksCount: 0,
      averageInterval: 600,
      averageDuration: 50,
      movementCount: 4,
      movementsPerHour: 2
    });
  });
});

describe('painless (Braxton-Hicks) contractions', () => {
  it('stay out of the rhythm, the 5-1-1 check and the session figures', () => {
    const labour = regular(13, 290, 65);
    const painless = [500, 1700, 3000].map((start) => ({ start, end: start + 30, intensity: 1 as const, braxtonHicks: true, curve: 'auto' as const }));
    const timeline: Timeline = {
      now: 3900,
      running: true,
      contractions: [...labour, ...painless].sort((a, b) => a.start - b.start),
      movements: []
    };
    const withoutPainless: Timeline = { ...timeline, contractions: labour };

    expect(rhythm(timeline)).toEqual(rhythm(withoutPainless));
    expect(fiveOneOne(timeline)).toEqual(fiveOneOne(withoutPainless));
    expect(sessionSummary(timeline)).toMatchObject({ contractionCount: 13, braxtonHicksCount: 3, averageDuration: 65 });
  });
});
