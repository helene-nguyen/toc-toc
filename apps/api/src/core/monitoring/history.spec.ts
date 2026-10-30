//~ The read and delete use cases — thin over the repository, checked together
import { beforeEach, describe, expect, it } from 'vitest';
import { ListMonitorings } from './listMonitorings.js';
import { GetMonitoring } from './getMonitoring.js';
import { DeleteMonitoring } from './deleteMonitoring.js';
import { RemoveContraction } from './removeContraction.js';
import { RemoveMovement } from './removeMovement.js';
import { InMemoryMonitoringRepository, at, ids } from '../../test-utils/fakes.js';

describe('monitoring history', () => {
  let monitorings: InMemoryMonitoringRepository;

  beforeEach(async () => {
    monitorings = new InMemoryMonitoringRepository();
    await monitorings.insert(1, { id: ids.other, startedAt: at(-600) });
    await monitorings.stop(ids.other, at(-500));
    await monitorings.insert(1, { id: ids.monitoring, startedAt: at(0) });
    await monitorings.saveContraction(ids.monitoring, {
      id: ids.contraction,
      startedAt: at(5),
      endedAt: at(6),
      intensity: 1, braxtonHicks: false, curve: 'auto' as const
    });
    await monitorings.saveMovement(ids.monitoring, { id: ids.movement, at: at(7) });
  });

  it('lists monitorings newest first, with their counts', async () => {
    expect(await new ListMonitorings(monitorings).handle(1)).toEqual([
      { id: ids.monitoring, startedAt: at(0), stoppedAt: null, contractionCount: 1, movementCount: 1 },
      { id: ids.other, startedAt: at(-600), stoppedAt: at(-500), contractionCount: 0, movementCount: 0 }
    ]);
  });

  it('gets one monitoring, 404-style error for an unknown one', async () => {
    const getMonitoring = new GetMonitoring(monitorings);

    expect((await getMonitoring.handle(ids.monitoring, 1)).ok).toBe(true);
    expect(await getMonitoring.handle('ffffffff-ffff-4fff-bfff-ffffffffffff', 1)).toEqual({
      ok: false,
      error: 'MONITORING_NOT_FOUND'
    });
  });

  it('removes a contraction or a movement tapped by mistake', async () => {
    expect((await new RemoveContraction(monitorings).handle(ids.monitoring, 1, ids.contraction)).ok).toBe(true);
    expect((await new RemoveMovement(monitorings).handle(ids.monitoring, 1, ids.movement)).ok).toBe(true);
    expect(await new RemoveMovement(monitorings).handle(ids.monitoring, 1, ids.movement)).toEqual({
      ok: false,
      error: 'MOVEMENT_NOT_FOUND'
    });
  });

  it('deletes a monitoring', async () => {
    const deleteMonitoring = new DeleteMonitoring(monitorings);

    expect((await deleteMonitoring.handle(ids.other, 1)).ok).toBe(true);
    expect(await deleteMonitoring.handle(ids.other, 1)).toEqual({ ok: false, error: 'MONITORING_NOT_FOUND' });
    expect(monitorings.rows).toHaveLength(1);
  });

  it("treats someone else's monitoring as unknown, for reading, listing, undoing and deleting", async () => {
    expect(await new GetMonitoring(monitorings).handle(ids.monitoring, 2)).toEqual({
      ok: false,
      error: 'MONITORING_NOT_FOUND'
    });
    expect(await new ListMonitorings(monitorings).handle(2)).toEqual([]);
    expect(await new RemoveMovement(monitorings).handle(ids.monitoring, 2, ids.movement)).toEqual({
      ok: false,
      error: 'MONITORING_NOT_FOUND'
    });
    expect(await new DeleteMonitoring(monitorings).handle(ids.monitoring, 2)).toEqual({
      ok: false,
      error: 'MONITORING_NOT_FOUND'
    });
    expect(monitorings.rows).toHaveLength(2);
  });
});
