import { beforeEach, describe, expect, it } from 'vitest';
import { StartMonitoring } from './startMonitoring.js';
import { FakeClock, InMemoryMonitoringRepository, at, ids } from '../../test-utils/fakes.js';

describe('StartMonitoring', () => {
  let monitorings: InMemoryMonitoringRepository;
  let startMonitoring: StartMonitoring;

  beforeEach(() => {
    monitorings = new InMemoryMonitoringRepository();
    startMonitoring = new StartMonitoring(monitorings, new FakeClock(at(0)));
  });

  it('starts a monitoring with the id and time the phone sent', async () => {
    const result = await startMonitoring.handle({ id: ids.monitoring, startedAt: at(-2) });

    expect(result).toEqual({
      ok: true,
      value: { id: ids.monitoring, startedAt: at(-2), stoppedAt: null, contractions: [], movements: [] }
    });
  });

  it('answers the existing monitoring when the same start is synced twice', async () => {
    await startMonitoring.handle({ id: ids.monitoring, startedAt: at(-2) });

    const result = await startMonitoring.handle({ id: ids.monitoring, startedAt: at(-2) });

    expect(result.ok).toBe(true);
    expect(monitorings.rows).toHaveLength(1);
  });

  it('refuses a second monitoring while one is running', async () => {
    await startMonitoring.handle({ id: ids.monitoring, startedAt: at(-2) });

    const result = await startMonitoring.handle({ id: ids.other, startedAt: at(0) });

    expect(result).toEqual({ ok: false, error: 'MONITORING_ALREADY_RUNNING' });
  });

  it('refuses a start in the future, beyond the clock slack', async () => {
    expect((await startMonitoring.handle({ id: ids.monitoring, startedAt: at(0.5) })).ok).toBe(true);
    expect(await startMonitoring.handle({ id: ids.other, startedAt: at(5) })).toEqual({
      ok: false,
      error: 'IN_THE_FUTURE'
    });
  });
});
