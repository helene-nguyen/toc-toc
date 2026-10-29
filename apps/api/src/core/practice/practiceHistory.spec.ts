//~ Listing and removing — the history joins contractions recorded on their
// own and painless ones marked during a monitoring
import { beforeEach, describe, expect, it } from 'vitest';
import { ListPracticeHistory } from './listPracticeHistory.js';
import { RemovePracticeContraction } from './removePracticeContraction.js';
import { InMemoryMonitoringRepository, InMemoryPracticeContractionRepository, at, ids } from '../../test-utils/fakes.js';

describe('practice history', () => {
  let monitorings: InMemoryMonitoringRepository;
  let practice: InMemoryPracticeContractionRepository;

  beforeEach(async () => {
    monitorings = new InMemoryMonitoringRepository();
    practice = new InMemoryPracticeContractionRepository(monitorings);
    await practice.save(1, { id: ids.practice, startedAt: at(-120), endedAt: at(-119.5) });
    await practice.save(2, { id: ids.practice2, startedAt: at(-60), endedAt: at(-59.5) });
    await monitorings.insert(1, { id: ids.monitoring, startedAt: at(0) });
    await monitorings.saveContraction(ids.monitoring, {
      id: ids.contraction,
      startedAt: at(5),
      endedAt: at(5.5),
      intensity: 1,
      braxtonHicks: true
    });
    await monitorings.saveContraction(ids.monitoring, {
      id: ids.contraction2,
      startedAt: at(10),
      endedAt: at(11),
      intensity: 2,
      braxtonHicks: false
    });
  });

  it("lists the user's practice contractions with the painless ones of their monitorings, newest first", async () => {
    expect(await new ListPracticeHistory(practice).handle(1)).toEqual([
      { id: ids.contraction, startedAt: at(5), endedAt: at(5.5), monitoringId: ids.monitoring },
      { id: ids.practice, startedAt: at(-120), endedAt: at(-119.5), monitoringId: null }
    ]);
  });

  it("removes one of the user's, never someone else's", async () => {
    const remove = new RemovePracticeContraction(practice);

    expect(await remove.handle(ids.practice2, 1)).toEqual({ ok: false, error: 'CONTRACTION_NOT_FOUND' });
    expect((await remove.handle(ids.practice, 1)).ok).toBe(true);
    expect(practice.rows.map((row) => row.id)).toEqual([ids.practice2]);
  });
});
