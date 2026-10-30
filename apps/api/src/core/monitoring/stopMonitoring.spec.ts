import { beforeEach, describe, expect, it } from 'vitest';
import { StopMonitoring } from './stopMonitoring.js';
import { FakeClock, InMemoryMonitoringRepository, at, ids } from '../../test-utils/fakes.js';

describe('StopMonitoring', () => {
  let monitorings: InMemoryMonitoringRepository;
  let stopMonitoring: StopMonitoring;

  beforeEach(async () => {
    monitorings = new InMemoryMonitoringRepository();
    stopMonitoring = new StopMonitoring(monitorings, new FakeClock(at(60)));
    await monitorings.insert(1, { id: ids.monitoring, startedAt: at(0) });
  });

  it('stops the monitoring at the time the phone sent', async () => {
    const result = await stopMonitoring.handle(ids.monitoring, 1, at(55));

    expect(result).toEqual({ ok: true, value: expect.objectContaining({ stoppedAt: at(55) }) });
  });

  it('ends a contraction still going on at the same time', async () => {
    await monitorings.saveContraction(ids.monitoring, {
      id: ids.contraction,
      startedAt: at(54),
      endedAt: null,
      intensity: 2, braxtonHicks: false, curve: 'auto' as const
    });

    const result = await stopMonitoring.handle(ids.monitoring, 1, at(55));

    expect(result.ok && result.value.contractions[0].endedAt).toEqual(at(55));
  });

  it('changes nothing when stopped twice', async () => {
    await stopMonitoring.handle(ids.monitoring, 1, at(55));

    const result = await stopMonitoring.handle(ids.monitoring, 1, at(58));

    expect(result).toEqual({ ok: true, value: expect.objectContaining({ stoppedAt: at(55) }) });
  });

  it("refuses a stop before the last tap, before the start or in the future", async () => {
    await monitorings.saveMovement(ids.monitoring, { id: ids.movement, at: at(50) });

    expect(await stopMonitoring.handle(ids.monitoring, 1, at(45))).toEqual({ ok: false, error: 'BEFORE_LAST_EVENT' });
    expect(await stopMonitoring.handle(ids.monitoring, 1, at(-1))).toEqual({ ok: false, error: 'BEFORE_START' });
    expect(await stopMonitoring.handle(ids.monitoring, 1, at(90))).toEqual({ ok: false, error: 'IN_THE_FUTURE' });
  });

  it('answers MONITORING_NOT_FOUND for an unknown id', async () => {
    expect(await stopMonitoring.handle(ids.other, 1, at(55))).toEqual({ ok: false, error: 'MONITORING_NOT_FOUND' });
  });
});
