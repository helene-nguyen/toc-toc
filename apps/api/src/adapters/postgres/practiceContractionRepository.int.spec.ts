import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PostgresPracticeContractionRepository } from './practiceContractionRepository.js';
import { PostgresMonitoringRepository } from './monitoringRepository.js';
import { createTestPool, insertUser, truncateAll } from '../../test-utils/integrationDb.js';
import { at, ids } from '../../test-utils/fakes.js';

describe('PostgresPracticeContractionRepository', () => {
  const pool = createTestPool();
  const practice = new PostgresPracticeContractionRepository(pool);
  const monitorings = new PostgresMonitoringRepository(pool);
  let userId: number;

  beforeEach(async () => {
    await truncateAll(pool);
    userId = await insertUser(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('stores a practice contraction, finds it going on, then ended (upsert on its id)', async () => {
    await practice.save(userId, { id: ids.practice, startedAt: at(10), endedAt: null });
    const ongoing = await practice.findOngoing(userId);
    await practice.save(userId, { id: ids.practice, startedAt: at(10), endedAt: at(10.5) });

    expect(ongoing).toEqual({ id: ids.practice, startedAt: at(10), endedAt: null });
    expect(await practice.findOngoing(userId)).toBeNull();
  });

  it('joins the painless contractions of the monitorings in the history, newest first', async () => {
    await practice.save(userId, { id: ids.practice, startedAt: at(-120), endedAt: at(-119.5) });
    await monitorings.insert(userId, { id: ids.monitoring, startedAt: at(0) });
    await monitorings.saveContraction(ids.monitoring, {
      id: ids.contraction,
      startedAt: at(5),
      endedAt: at(5.5),
      intensity: 1,
      braxtonHicks: true, curve: 'auto' as const
    });
    await monitorings.saveContraction(ids.monitoring, {
      id: ids.contraction2,
      startedAt: at(10),
      endedAt: at(11),
      intensity: 2,
      braxtonHicks: false, curve: 'auto' as const
    });

    expect(await practice.history(userId)).toEqual([
      { id: ids.contraction, startedAt: at(5), endedAt: at(5.5), monitoringId: ids.monitoring },
      { id: ids.practice, startedAt: at(-120), endedAt: at(-119.5), monitoringId: null }
    ]);
  });

  it("keeps one going on per user, and never touches someone else's", async () => {
    const otherId = await insertUser(pool, 'partner@example.com');
    await practice.save(userId, { id: ids.practice, startedAt: at(10), endedAt: null });

    await expect(practice.save(userId, { id: ids.practice2, startedAt: at(20), endedAt: null })).rejects.toThrow(
      /practice_contraction_one_ongoing/
    );
    await practice.save(otherId, { id: ids.practice, startedAt: at(0), endedAt: at(1) });
    expect(await practice.findOngoing(userId)).toEqual({ id: ids.practice, startedAt: at(10), endedAt: null });
    expect(await practice.remove(ids.practice, otherId)).toBe(false);
  });
});
