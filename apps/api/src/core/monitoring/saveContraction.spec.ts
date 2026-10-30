import { beforeEach, describe, expect, it } from 'vitest';
import { SaveContraction } from './saveContraction.js';
import type { Contraction } from './ports.js';
import { FakeClock, InMemoryMonitoringRepository, at, ids } from '../../test-utils/fakes.js';

const contraction = (overrides: Partial<Contraction> = {}): Contraction => ({
  id: ids.contraction,
  startedAt: at(10),
  endedAt: at(11),
  intensity: 2,
  braxtonHicks: false,
  curve: 'auto',
  ...overrides
});

describe('SaveContraction', () => {
  let monitorings: InMemoryMonitoringRepository;
  let saveContraction: SaveContraction;

  beforeEach(async () => {
    monitorings = new InMemoryMonitoringRepository();
    saveContraction = new SaveContraction(monitorings, new FakeClock(at(30)));
    await monitorings.insert(1, { id: ids.monitoring, startedAt: at(0) });
  });

  it('records a contraction going on, then ends it and sets its intensity (same id)', async () => {
    await saveContraction.handle(ids.monitoring, 1, contraction({ endedAt: null }));

    const result = await saveContraction.handle(ids.monitoring, 1, contraction({ intensity: 3 }));

    expect(result).toEqual({ ok: true, value: contraction({ intensity: 3 }) });
    expect(monitorings.rows[0].contractions).toEqual([contraction({ intensity: 3 })]);
  });

  it('refuses a second contraction going on', async () => {
    await saveContraction.handle(ids.monitoring, 1, contraction({ endedAt: null }));

    const result = await saveContraction.handle(
      ids.monitoring,
      1,
      contraction({ id: ids.contraction2, startedAt: at(20), endedAt: null })
    );

    expect(result).toEqual({ ok: false, error: 'CONTRACTION_IN_PROGRESS' });
  });

  it('refuses overlapping contractions, but accepts one starting when the other ends', async () => {
    await saveContraction.handle(ids.monitoring, 1, contraction());

    const overlapping = await saveContraction.handle(
      ids.monitoring,
      1,
      contraction({ id: ids.contraction2, startedAt: at(10.5), endedAt: at(12) })
    );
    const touching = await saveContraction.handle(
      ids.monitoring,
      1,
      contraction({ id: ids.contraction2, startedAt: at(11), endedAt: at(12) })
    );

    expect(overlapping).toEqual({ ok: false, error: 'CONTRACTIONS_OVERLAP' });
    expect(touching.ok).toBe(true);
  });

  it('refuses an end before the start', async () => {
    expect(await saveContraction.handle(ids.monitoring, 1, contraction({ endedAt: at(9) }))).toEqual({
      ok: false,
      error: 'ENDS_BEFORE_START'
    });
  });

  it('keeps contractions inside the monitoring and out of the future', async () => {
    expect(await saveContraction.handle(ids.monitoring, 1, contraction({ startedAt: at(-1) }))).toEqual({
      ok: false,
      error: 'BEFORE_START'
    });
    expect(await saveContraction.handle(ids.monitoring, 1, contraction({ endedAt: at(40) }))).toEqual({
      ok: false,
      error: 'IN_THE_FUTURE'
    });

    await monitorings.stop(ids.monitoring, at(20));
    expect(
      await saveContraction.handle(ids.monitoring, 1, contraction({ startedAt: at(19.5), endedAt: at(21) }))
    ).toEqual({ ok: false, error: 'AFTER_STOP' });
    expect(await saveContraction.handle(ids.monitoring, 1, contraction({ endedAt: null }))).toEqual({
      ok: false,
      error: 'MONITORING_STOPPED'
    });
  });

  it("can't record in someone else's monitoring", async () => {
    expect(await saveContraction.handle(ids.monitoring, 2, contraction())).toEqual({
      ok: false,
      error: 'MONITORING_NOT_FOUND'
    });
  });

  it('answers MONITORING_NOT_FOUND for an unknown monitoring', async () => {
    expect(await saveContraction.handle(ids.other, 1, contraction())).toEqual({
      ok: false,
      error: 'MONITORING_NOT_FOUND'
    });
  });
});
