import { describe, expect, it } from 'vitest';
import { buildTestApp, signUp } from '../../../test-utils/buildTestApp.js';
import { at, ids } from '../../../test-utils/fakes.js';

const base = '/api/v1/practice-contractions';

describe('/api/v1/practice-contractions', () => {
  it('requires a session', async () => {
    const { app } = buildTestApp();

    expect((await app.inject({ method: 'GET', url: base })).statusCode).toBe(401);
  });

  it('records a contraction outside any monitoring, ends it, lists it, removes it', async () => {
    const { app } = buildTestApp();
    const cookies = await signUp(app);
    const put = (body: object) => app.inject({ method: 'PUT', url: `${base}/${ids.practice}`, body, cookies });

    const started = await put({ startedAt: at(10).toISOString(), endedAt: null });
    const ended = await put({ startedAt: at(10).toISOString(), endedAt: at(10.5).toISOString() });
    const list = await app.inject({ method: 'GET', url: base, cookies });
    const removed = await app.inject({ method: 'DELETE', url: `${base}/${ids.practice}`, cookies });

    expect([started.statusCode, ended.statusCode, removed.statusCode]).toEqual([200, 200, 204]);
    expect(list.json().contractions).toEqual([
      {
        id: ids.practice,
        startedAt: '2026-10-29T20:10:00.000Z',
        endedAt: '2026-10-29T20:10:30.000Z',
        monitoringId: null
      }
    ]);
    expect((await app.inject({ method: 'GET', url: base, cookies })).json().contractions).toEqual([]);
  });

  it('answers 409 for a second one going on, 400 for an end before the start', async () => {
    const { app } = buildTestApp();
    const cookies = await signUp(app);
    await app.inject({ method: 'PUT', url: `${base}/${ids.practice}`, body: { startedAt: at(10).toISOString(), endedAt: null }, cookies });

    const second = await app.inject({
      method: 'PUT',
      url: `${base}/${ids.practice2}`,
      body: { startedAt: at(20).toISOString(), endedAt: null },
      cookies
    });
    const backwards = await app.inject({
      method: 'PUT',
      url: `${base}/${ids.practice2}`,
      body: { startedAt: at(20).toISOString(), endedAt: at(19).toISOString() },
      cookies
    });

    expect([second.statusCode, second.json().error]).toEqual([409, 'CONTRACTION_IN_PROGRESS']);
    expect([backwards.statusCode, backwards.json().error]).toEqual([400, 'ENDS_BEFORE_START']);
  });

  it("keeps each person's history to themselves", async () => {
    const { app } = buildTestApp();
    const mine = await signUp(app);
    const theirs = await signUp(app, 'partner@example.com');
    await app.inject({
      method: 'PUT',
      url: `${base}/${ids.practice}`,
      body: { startedAt: at(10).toISOString(), endedAt: at(10.5).toISOString() },
      cookies: mine
    });

    expect((await app.inject({ method: 'GET', url: base, cookies: theirs })).json().contractions).toEqual([]);
    expect((await app.inject({ method: 'DELETE', url: `${base}/${ids.practice}`, cookies: theirs })).statusCode).toBe(404);
  });
});
