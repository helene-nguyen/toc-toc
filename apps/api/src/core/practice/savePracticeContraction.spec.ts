import { beforeEach, describe, expect, it } from 'vitest';
import { SavePracticeContraction } from './savePracticeContraction.js';
import type { PracticeContraction } from './ports.js';
import { FakeClock, InMemoryMonitoringRepository, InMemoryPracticeContractionRepository, at, ids } from '../../test-utils/fakes.js';

const contraction = (overrides: Partial<PracticeContraction> = {}): PracticeContraction => ({
  id: ids.practice,
  startedAt: at(10),
  endedAt: at(10.5),
  ...overrides
});

describe('SavePracticeContraction', () => {
  let practice: InMemoryPracticeContractionRepository;
  let save: SavePracticeContraction;

  beforeEach(() => {
    practice = new InMemoryPracticeContractionRepository(new InMemoryMonitoringRepository());
    save = new SavePracticeContraction(practice, new FakeClock(at(30)));
  });

  it('records one going on, then ends it (same id), without any monitoring', async () => {
    await save.handle(1, contraction({ endedAt: null }));

    const result = await save.handle(1, contraction());

    expect(result).toEqual({ ok: true, value: contraction() });
    expect(practice.rows).toEqual([{ ...contraction(), userId: 1 }]);
  });

  it('refuses a second one going on, but not for another user', async () => {
    await save.handle(1, contraction({ endedAt: null }));

    expect(await save.handle(1, contraction({ id: ids.practice2, startedAt: at(20), endedAt: null }))).toEqual({
      ok: false,
      error: 'CONTRACTION_IN_PROGRESS'
    });
    expect((await save.handle(2, contraction({ id: ids.practice2, endedAt: null }))).ok).toBe(true);
  });

  it('refuses an end before the start, and times in the future', async () => {
    expect(await save.handle(1, contraction({ endedAt: at(9) }))).toEqual({ ok: false, error: 'ENDS_BEFORE_START' });
    expect(await save.handle(1, contraction({ startedAt: at(40), endedAt: null }))).toEqual({
      ok: false,
      error: 'IN_THE_FUTURE'
    });
  });
});
