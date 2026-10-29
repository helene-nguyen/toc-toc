import { describe, expect, it } from 'vitest';
import { buildTestApp, signUp } from '../../../test-utils/buildTestApp.js';
import { at, ids } from '../../../test-utils/fakes.js';

const base = `/api/v1/monitorings`;

//~ Shared setup: a signed-in user with a monitoring started at 20:00, "now" being 21:00
const startedApp = async () => {
  const testApp = buildTestApp();
  const { app } = testApp;
  const cookies = await signUp(app);
  await app.inject({
    method: 'POST',
    url: base,
    body: { id: ids.monitoring, startedAt: at(0).toISOString() },
    cookies
  });
  const inject: typeof app.inject = ((options: object) => app.inject({ ...options, cookies })) as typeof app.inject;

  return {
    ...testApp,
    cookies,
    inject,
    get: () => inject({ method: 'GET', url: `${base}/${ids.monitoring}` }),
    contraction: (id: string, body: object) =>
      inject({ method: 'PUT', url: `${base}/${ids.monitoring}/contractions/${id}`, body }),
    movement: (id: string, body: object) =>
      inject({ method: 'PUT', url: `${base}/${ids.monitoring}/movements/${id}`, body }),
    stop: (stoppedAt: Date) =>
      inject({ method: 'POST', url: `${base}/${ids.monitoring}/stop`, body: { stoppedAt: stoppedAt.toISOString() } })
  };
};

describe('/api/v1/monitorings', () => {
  it('requires a session', async () => {
    const { app } = buildTestApp();

    expect((await app.inject({ method: 'GET', url: base })).statusCode).toBe(401);
    expect(
      (await app.inject({ method: 'POST', url: base, body: { id: ids.monitoring, startedAt: at(0).toISOString() } }))
        .statusCode
    ).toBe(401);
  });

  it('starts a monitoring and answers it with ISO dates', async () => {
    const { app } = buildTestApp();
    const cookies = await signUp(app);

    const response = await app.inject({
      method: 'POST',
      url: base,
      body: { id: ids.monitoring, startedAt: at(0).toISOString() },
      cookies
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().monitoring).toEqual({
      id: ids.monitoring,
      startedAt: '2026-10-29T20:00:00.000Z',
      stoppedAt: null,
      contractions: [],
      movements: []
    });
  });

  it('answers 409 when a monitoring already runs', async () => {
    const api = await startedApp();

    const response = await api.inject({
      method: 'POST',
      url: base,
      body: { id: ids.other, startedAt: at(10).toISOString() }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'MONITORING_ALREADY_RUNNING' });
  });

  it('records a whole session: contraction, movement, stop, then lists it', async () => {
    const api = await startedApp();

    const started = await api.contraction(ids.contraction, {
      startedAt: at(10).toISOString(),
      endedAt: null,
      intensity: 2
    });
    const ended = await api.contraction(ids.contraction, {
      startedAt: at(10).toISOString(),
      endedAt: at(11).toISOString(),
      intensity: 3
    });
    const moved = await api.movement(ids.movement, { at: at(12).toISOString() });
    const stopped = await api.stop(at(30));
    const list = await api.inject({ method: 'GET', url: base });

    expect([started.statusCode, ended.statusCode, moved.statusCode, stopped.statusCode]).toEqual([200, 200, 200, 200]);
    expect((await api.get()).json().monitoring).toMatchObject({
      stoppedAt: '2026-10-29T20:30:00.000Z',
      contractions: [{ id: ids.contraction, endedAt: '2026-10-29T20:11:00.000Z', intensity: 3 }],
      movements: [{ id: ids.movement, at: '2026-10-29T20:12:00.000Z' }]
    });
    expect(list.json().monitorings).toEqual([
      expect.objectContaining({ id: ids.monitoring, contractionCount: 1, movementCount: 1 })
    ]);
  });

  it('marks a painless (Braxton-Hicks) contraction, and treats a missing mark as a labour one', async () => {
    const api = await startedApp();

    await api.contraction(ids.contraction, {
      startedAt: at(10).toISOString(),
      endedAt: at(11).toISOString(),
      intensity: 1,
      braxtonHicks: true
    });
    // an older app version sends no mark
    await api.contraction(ids.contraction2, {
      startedAt: at(20).toISOString(),
      endedAt: at(21).toISOString(),
      intensity: 2
    });

    expect((await api.get()).json().monitoring.contractions).toMatchObject([
      { id: ids.contraction, braxtonHicks: true },
      { id: ids.contraction2, braxtonHicks: false }
    ]);
  });

  it('removes a tap made by mistake, 404 when it is already gone', async () => {
    const api = await startedApp();
    await api.movement(ids.movement, { at: at(12).toISOString() });
    const url = `${base}/${ids.monitoring}/movements/${ids.movement}`;

    expect((await api.inject({ method: 'DELETE', url })).statusCode).toBe(204);
    expect((await api.inject({ method: 'DELETE', url })).statusCode).toBe(404);
  });

  it('maps the core errors: 409 for clashes, 400 for times, 404 for unknown ids', async () => {
    const api = await startedApp();
    await api.contraction(ids.contraction, { startedAt: at(10).toISOString(), endedAt: null, intensity: 2 });

    const second = await api.contraction(ids.contraction2, {
      startedAt: at(20).toISOString(),
      endedAt: null,
      intensity: 2
    });
    const future = await api.movement(ids.movement, { at: at(120).toISOString() });
    const unknown = await api.inject({ method: 'GET', url: `${base}/${ids.other}` });

    expect([second.statusCode, second.json().error]).toEqual([409, 'CONTRACTION_IN_PROGRESS']);
    expect([future.statusCode, future.json().error]).toEqual([400, 'IN_THE_FUTURE']);
    expect([unknown.statusCode, unknown.json().error]).toEqual([404, 'MONITORING_NOT_FOUND']);
  });

  it('validates the requests: uuid ids, ISO dates, intensity 1 to 3', async () => {
    const api = await startedApp();

    expect((await api.inject({ method: 'GET', url: `${base}/not-a-uuid` })).statusCode).toBe(400);
    expect((await api.movement(ids.movement, { at: 'yesterday' })).statusCode).toBe(400);
    expect(
      (await api.contraction(ids.contraction, { startedAt: at(10).toISOString(), endedAt: null, intensity: 5 }))
        .statusCode
    ).toBe(400);
  });

  it('deletes a monitoring', async () => {
    const api = await startedApp();
    const url = `${base}/${ids.monitoring}`;

    expect((await api.inject({ method: 'DELETE', url })).statusCode).toBe(204);
    expect((await api.inject({ method: 'GET', url })).statusCode).toBe(404);
  });

  it("keeps each person's monitorings to themselves", async () => {
    const api = await startedApp();
    const other = await signUp(api.app, 'partner@example.com');

    const list = await api.app.inject({ method: 'GET', url: base, cookies: other });
    const read = await api.app.inject({ method: 'GET', url: `${base}/${ids.monitoring}`, cookies: other });
    const tap = await api.app.inject({
      method: 'PUT',
      url: `${base}/${ids.monitoring}/movements/${ids.movement}`,
      body: { at: at(12).toISOString() },
      cookies: other
    });

    expect(list.json().monitorings).toEqual([]);
    expect(read.statusCode).toBe(404);
    expect(tap.statusCode).toBe(404);
    expect((await api.get()).json().monitoring.movements).toEqual([]);
  });
});
