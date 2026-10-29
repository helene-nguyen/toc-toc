import { describe, expect, it } from 'vitest';
import { toTimeline } from './timeline';
import type { Monitoring } from '../monitoringTypes';

const monitoring: Monitoring = {
  id: 'm',
  startedAt: '2026-10-29T20:00:00.000Z',
  stoppedAt: null,
  contractions: [
    { id: 'c2', startedAt: '2026-10-29T20:10:00.000Z', endedAt: null, intensity: 3, braxtonHicks: true },
    { id: 'c1', startedAt: '2026-10-29T20:02:00.000Z', endedAt: '2026-10-29T20:03:00.000Z', intensity: 1 }
  ],
  movements: [{ id: 'v', at: '2026-10-29T20:05:30.000Z' }]
};

describe('toTimeline', () => {
  // c1 has no braxtonHicks at all, like contractions recorded before it existed
  it('turns dates into seconds since the start, in time order', () => {
    expect(toTimeline(monitoring, new Date('2026-10-29T20:11:00.000Z'))).toEqual({
      now: 660,
      running: true,
      contractions: [
        { start: 120, end: 180, intensity: 1, braxtonHicks: false },
        { start: 600, end: null, intensity: 3, braxtonHicks: true }
      ],
      movements: [330]
    });
  });

  it('ends at the stop once the monitoring is stopped', () => {
    const stopped = { ...monitoring, stoppedAt: '2026-10-29T21:00:00.000Z' };

    expect(toTimeline(stopped, new Date('2026-10-30T08:00:00.000Z'))).toMatchObject({ now: 3600, running: false });
  });
});
