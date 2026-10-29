import { describe, expect, it } from 'vitest';
import { reconcileRunning } from './reconcileRunning';
import type { Monitoring, MonitoringSummary } from '../monitoringTypes';
import type { OutboxRequest } from '../monitoringSlice';

const live = (id: string, stoppedAt: string | null = null): Monitoring => ({
  id,
  startedAt: '2026-10-29T20:00:00.000Z',
  stoppedAt,
  contractions: [],
  movements: []
});

const summary = (id: string, stoppedAt: string | null = null): MonitoringSummary => ({
  id,
  startedAt: '2026-10-29T20:00:00.000Z',
  stoppedAt,
  contractionCount: 0,
  movementCount: 0
});

const start = (id: string): OutboxRequest => ({ seq: 1, kind: 'start', id, startedAt: '2026-10-29T20:00:00.000Z' });

describe('reconcileRunning', () => {
  it('resumes the monitoring running on the server when the phone has none (signed in again, other phone)', () => {
    expect(reconcileRunning(null, [], [summary('m1')])).toEqual({ action: 'resume', id: 'm1' });
    expect(reconcileRunning(live('old', '2026-10-29T19:00:00.000Z'), [], [summary('m1')])).toEqual({
      action: 'resume',
      id: 'm1'
    });
  });

  it("drops the phone's monitoring when the server runs another one: its start was refused", () => {
    expect(reconcileRunning(live('m2'), [], [summary('m1'), summary('m0', '2026-10-28T10:00:00.000Z')])).toEqual({
      action: 'discard',
      id: 'm2'
    });
  });

  it("keeps the phone's monitoring while its start waits to be sent (offline)", () => {
    expect(reconcileRunning(live('m2'), [start('m2')], [summary('m1')])).toBeNull();
  });

  it('does not resume a monitoring just stopped here, whose stop is still on its way', () => {
    expect(reconcileRunning(live('m1', '2026-10-29T21:00:00.000Z'), [], [summary('m1')])).toBeNull();
  });

  it('leaves things alone when both agree, or nothing runs', () => {
    expect(reconcileRunning(live('m1'), [], [summary('m1')])).toBeNull();
    expect(reconcileRunning(null, [], [summary('m0', '2026-10-28T10:00:00.000Z')])).toBeNull();
    // a list fetched before this phone's start reached the server: nothing to say yet
    expect(reconcileRunning(live('m2'), [], [])).toBeNull();
  });
});
