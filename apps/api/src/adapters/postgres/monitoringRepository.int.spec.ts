import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PostgresMonitoringRepository } from './monitoringRepository.js';
import { createTestPool, insertUser, truncateAll } from '../../test-utils/integrationDb.js';
import { at, ids } from '../../test-utils/fakes.js';

describe('PostgresMonitoringRepository', () => {
  const pool = createTestPool();
  const monitorings = new PostgresMonitoringRepository(pool);

  let userId: number;

  beforeEach(async () => {
    await truncateAll(pool);
    userId = await insertUser(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('stores a monitoring with its contractions and movements, in time order', async () => {
    await monitorings.insert(userId, { id: ids.monitoring, startedAt: at(0) });
    await monitorings.saveContraction(ids.monitoring, {
      id: ids.contraction2,
      startedAt: at(20),
      endedAt: null,
      intensity: 3
    });
    await monitorings.saveContraction(ids.monitoring, {
      id: ids.contraction,
      startedAt: at(10),
      endedAt: at(11),
      intensity: 1
    });
    await monitorings.saveMovement(ids.monitoring, { id: ids.movement, at: at(12) });

    expect(await monitorings.findById(ids.monitoring, userId)).toEqual({
      id: ids.monitoring,
      startedAt: at(0),
      stoppedAt: null,
      contractions: [
        { id: ids.contraction, startedAt: at(10), endedAt: at(11), intensity: 1 },
        { id: ids.contraction2, startedAt: at(20), endedAt: null, intensity: 3 }
      ],
      movements: [{ id: ids.movement, at: at(12) }]
    });
  });

  it('upserts a tap on its id — a retried sync lands once', async () => {
    await monitorings.insert(userId, { id: ids.monitoring, startedAt: at(0) });
    const contraction = { id: ids.contraction, startedAt: at(10), endedAt: null, intensity: 2 as const };

    await monitorings.saveContraction(ids.monitoring, contraction);
    await monitorings.saveContraction(ids.monitoring, { ...contraction, endedAt: at(11) });
    await monitorings.saveMovement(ids.monitoring, { id: ids.movement, at: at(12) });
    await monitorings.saveMovement(ids.monitoring, { id: ids.movement, at: at(12) });

    const monitoring = await monitorings.findById(ids.monitoring, userId);
    expect(monitoring?.contractions).toEqual([{ ...contraction, endedAt: at(11) }]);
    expect(monitoring?.movements).toHaveLength(1);
  });

  it('finds the running monitoring, lists newest first with counts, stops one', async () => {
    await monitorings.insert(userId, { id: ids.other, startedAt: at(-600) });
    await monitorings.stop(ids.other, at(-500));
    await monitorings.insert(userId, { id: ids.monitoring, startedAt: at(0) });
    await monitorings.saveMovement(ids.monitoring, { id: ids.movement, at: at(1) });

    expect((await monitorings.findRunning(userId))?.id).toBe(ids.monitoring);
    expect(await monitorings.list(userId)).toEqual([
      { id: ids.monitoring, startedAt: at(0), stoppedAt: null, contractionCount: 0, movementCount: 1 },
      { id: ids.other, startedAt: at(-600), stoppedAt: at(-500), contractionCount: 0, movementCount: 0 }
    ]);
  });

  it('refuses a second running monitoring for the same user at the database level too', async () => {
    await monitorings.insert(userId, { id: ids.monitoring, startedAt: at(0) });

    await expect(monitorings.insert(userId, { id: ids.other, startedAt: at(1) })).rejects.toThrow(/monitoring_one_running/);
  });

  it('removes taps and monitorings, the latter with everything in it', async () => {
    await monitorings.insert(userId, { id: ids.monitoring, startedAt: at(0) });
    await monitorings.saveMovement(ids.monitoring, { id: ids.movement, at: at(1) });
    await monitorings.saveContraction(ids.monitoring, {
      id: ids.contraction,
      startedAt: at(2),
      endedAt: at(3),
      intensity: 2
    });

    expect(await monitorings.removeMovement(ids.monitoring, ids.movement)).toBe(true);
    expect(await monitorings.removeMovement(ids.monitoring, ids.movement)).toBe(false);
    expect(await monitorings.remove(ids.monitoring, userId)).toBe(true);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM contraction');
    expect(rows[0].n).toBe(0);
  });

  it("hides someone else's monitorings, and lets them run their own at the same time", async () => {
    const otherId = await insertUser(pool, 'partner@example.com');
    await monitorings.insert(userId, { id: ids.monitoring, startedAt: at(0) });

    await monitorings.insert(otherId, { id: ids.other, startedAt: at(1) });

    expect(await monitorings.findById(ids.monitoring, otherId)).toBeNull();
    expect((await monitorings.list(otherId)).map((summary) => summary.id)).toEqual([ids.other]);
    expect(await monitorings.remove(ids.monitoring, otherId)).toBe(false);
  });

  it('hands monitorings recorded before accounts to the user who adopts them', async () => {
    await pool.query(`INSERT INTO monitoring (id, started_at) VALUES ($1, $2)`, [ids.other, at(-60)]);

    await monitorings.adoptUnowned(userId);

    expect((await monitorings.findById(ids.other, userId))?.id).toBe(ids.other);
  });
});
