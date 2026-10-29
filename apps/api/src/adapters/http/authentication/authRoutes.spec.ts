import { describe, expect, it } from 'vitest';
import { buildTestApp, signUp } from '../../../test-utils/buildTestApp.js';

const credentials = { email: 'helene@example.com', password: 'correct-horse-battery' };
const cookie = (response: { cookies: { name: string; value: string }[] }, name: string) =>
  response.cookies.find((candidate) => candidate.name === name);

describe('authentication routes', () => {
  it('signs up and opens the session at once', async () => {
    const { app } = buildTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/signup',
      body: { ...credentials, passwordConfirmation: credentials.password }
    });
    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      cookies: { access_token: cookie(response, 'access_token')!.value }
    });

    expect(response.statusCode).toBe(201);
    expect(cookie(response, 'refresh_token')).toMatchObject({ httpOnly: true, path: '/api/v1/token' });
    expect(me.json()).toEqual({ user: { id: 1, email: 'helene@example.com', name: null } });
  });

  it('answers 409 for an email already used, 403 outside the allowlist, 400 for a short password', async () => {
    const { app } = buildTestApp({ allowedEmails: ['helene@example.com'] });
    await signUp(app);

    const signup = (body: object) => app.inject({ method: 'POST', url: '/api/v1/signup', body });

    expect((await signup({ ...credentials, passwordConfirmation: credentials.password })).statusCode).toBe(409);
    expect(
      (await signup({ email: 'x@y.fr', password: credentials.password, passwordConfirmation: credentials.password }))
        .statusCode
    ).toBe(403);
    expect((await signup({ email: 'a@b.fr', password: 'short', passwordConfirmation: 'short' })).statusCode).toBe(400);
  });

  it('signs in with the right password only', async () => {
    const { app } = buildTestApp();
    await signUp(app);

    const good = await app.inject({ method: 'POST', url: '/api/v1/signin', body: credentials });
    const bad = await app.inject({ method: 'POST', url: '/api/v1/signin', body: { ...credentials, password: 'nope' } });

    expect(good.statusCode).toBe(200);
    expect(cookie(good, 'access_token')).toBeDefined();
    expect([bad.statusCode, bad.json().error]).toEqual([401, 'INVALID_CREDENTIALS']);
  });

  it('renews the session from the refresh token, and signs out', async () => {
    const { app } = buildTestApp();
    const signin = await (async () => {
      await signUp(app);
      return app.inject({ method: 'POST', url: '/api/v1/signin', body: credentials });
    })();

    const refreshed = await app.inject({
      method: 'POST',
      url: '/api/v1/token/refresh',
      cookies: { refresh_token: cookie(signin, 'refresh_token')!.value }
    });
    const signout = await app.inject({ method: 'POST', url: '/api/v1/signout' });

    expect(refreshed.statusCode).toBe(204);
    expect(cookie(refreshed, 'access_token')).toBeDefined();
    expect(cookie(signout, 'access_token')?.value).toBe('');
    expect((await app.inject({ method: 'POST', url: '/api/v1/token/refresh' })).statusCode).toBe(401);
  });

  it('refuses /me without a session, or with a refresh token in place of the access one', async () => {
    const { app } = buildTestApp();
    await signUp(app);
    const signin = await app.inject({ method: 'POST', url: '/api/v1/signin', body: credentials });

    expect((await app.inject({ method: 'GET', url: '/api/v1/me' })).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/v1/me',
          cookies: { access_token: cookie(signin, 'refresh_token')!.value }
        })
      ).statusCode
    ).toBe(401);
  });

  it('tells the sign-in page whether Google is on', async () => {
    const { app } = buildTestApp();

    expect((await app.inject({ method: 'GET', url: '/api/v1/auth/providers' })).json()).toEqual({ google: true });
  });

  it('signs in with Google and comes back to the app with a session', async () => {
    const { app, users } = buildTestApp();

    const callback = await app.inject({ method: 'GET', url: '/api/v1/auth/google/callback?code=x&state=y' });

    expect(callback.statusCode).toBe(302);
    expect(callback.headers.location).toBe('http://localhost:4210');
    expect(cookie(callback, 'access_token')).toBeDefined();
    expect(users.rows[0]).toMatchObject({ email: 'helene@example.com', name: 'Hélène', passwordHash: null });
  });

  it('sends a refused or failed Google sign-in back to the sign-in page', async () => {
    const notAllowed = buildTestApp({ allowedEmails: ['someone@else.com'] });
    const failed = buildTestApp({ googleProfile: null });

    const refused = await notAllowed.app.inject({ method: 'GET', url: '/api/v1/auth/google/callback' });
    const broken = await failed.app.inject({ method: 'GET', url: '/api/v1/auth/google/callback' });

    expect(refused.headers.location).toBe('http://localhost:4210/signin?error=not-allowed');
    expect(broken.headers.location).toBe('http://localhost:4210/signin?error=google');
    expect(cookie(refused, 'access_token')).toBeUndefined();
  });
});
