import { beforeEach, describe, expect, it } from 'vitest';
import { RecordMovement } from './recordMovement.js';
import { FakeClock, InMemoryMonitoringRepository, at, ids } from '../../test-utils/fakes.js';

describe('RecordMovement', () => {
  let monitorings: InMemoryMonitoringRepository;
  let recordMovement: RecordMovement;

  beforeEach(async () => {
    monitorings = new InMemoryMonitoringRepository();
    recordMovement = new RecordMovement(monitorings, new FakeClock(at(30)));
    await monitorings.insert(1, { id: ids.monitoring, startedAt: at(0) });
  });

  it('records a movement, once even when synced twice', async () => {
    await recordMovement.handle(ids.monitoring, 1, { id: ids.movement, at: at(12) });

    const result = await recordMovement.handle(ids.monitoring, 1, { id: ids.movement, at: at(12) });

    expect(result).toEqual({ ok: true, value: { id: ids.movement, at: at(12) } });
    expect(monitorings.rows[0].movements).toHaveLength(1);
  });

  it('keeps movements inside the monitoring', async () => {
    expect(await recordMovement.handle(ids.monitoring, 1, { id: ids.movement, at: at(-3) })).toEqual({
      ok: false,
      error: 'BEFORE_START'
    });
    expect(await recordMovement.handle(ids.other, 1, { id: ids.movement, at: at(12) })).toEqual({
      ok: false,
      error: 'MONITORING_NOT_FOUND'
    });
  });
});
