import { describe, expect, it } from 'vitest';
import { dayKey, groupByDay, practiceSummary } from './practiceStats';
import type { PracticeEntry } from '../practiceTypes';

// local time: the summary works on the phone's calendar days
const local = (day: number, hour: number, minute = 0, second = 0) => new Date(2026, 9, day, hour, minute, second);

const entry = (id: string, start: Date, seconds: number | null, monitoringId: string | null = null): PracticeEntry => ({
  id,
  startedAt: start.toISOString(),
  endedAt: seconds === null ? null : new Date(start.getTime() + seconds * 1000).toISOString(),
  monitoringId
});

const entries = [
  entry('a', local(27, 21, 0), 30),
  entry('b', local(29, 9, 0), 40),
  entry('c', local(29, 9, 20), 50, 'session-1'),
  entry('d', local(29, 10, 0), 60)
];

describe('practiceSummary', () => {
  it("sums up today and the last seven days", () => {
    expect(practiceSummary(entries, local(29, 10, 30))).toEqual({
      todayCount: 3,
      todayAverageDuration: 50,
      todayAverageInterval: 30 * 60,
      sinceLast: 30 * 60,
      lastDuration: 60,
      week: [
        { day: '2026-10-23', count: 0 },
        { day: '2026-10-24', count: 0 },
        { day: '2026-10-25', count: 0 },
        { day: '2026-10-26', count: 0 },
        { day: '2026-10-27', count: 1 },
        { day: '2026-10-28', count: 0 },
        { day: '2026-10-29', count: 3 }
      ]
    });
  });

  it('has nothing to say before the first one, and no duration while one goes on', () => {
    expect(practiceSummary([], local(29, 10))).toMatchObject({
      todayCount: 0,
      todayAverageDuration: null,
      todayAverageInterval: null,
      sinceLast: null,
      lastDuration: null
    });
    expect(practiceSummary([entry('x', local(29, 10), null)], local(29, 10, 0, 20))).toMatchObject({
      todayCount: 1,
      sinceLast: 20,
      lastDuration: null
    });
  });
});

describe('groupByDay', () => {
  it('groups by local day, newest first, with the gap since the previous one across days', () => {
    expect(groupByDay(entries)).toEqual([
      {
        day: '2026-10-29',
        rows: [
          { entry: entries[3], duration: 60, interval: 40 * 60 },
          { entry: entries[2], duration: 50, interval: 20 * 60 },
          { entry: entries[1], duration: 40, interval: (36 * 3600) }
        ]
      },
      { day: '2026-10-27', rows: [{ entry: entries[0], duration: 30, interval: null }] }
    ]);
  });

  it('names days by the local calendar', () => {
    expect(dayKey(local(29, 23, 59))).toBe('2026-10-29');
    expect(dayKey(local(30, 0, 1))).toBe('2026-10-30');
  });
});
