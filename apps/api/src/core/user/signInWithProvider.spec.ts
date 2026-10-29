import { beforeEach, describe, expect, it } from 'vitest';
import { SignInWithProvider, type OAuthProfile } from './signInWithProvider.js';
import {
  InMemoryAuthProviderRepository,
  InMemoryMonitoringRepository,
  InMemoryUserAccountRepository,
  at,
  ids
} from '../../test-utils/fakes.js';

const profile: OAuthProfile = {
  provider: 'google',
  providerAccountId: 'goog-1',
  email: 'Helene@Example.com',
  name: 'Hélène'
};

describe('SignInWithProvider', () => {
  let users: InMemoryUserAccountRepository;
  let authProviders: InMemoryAuthProviderRepository;
  let monitorings: InMemoryMonitoringRepository;

  beforeEach(() => {
    users = new InMemoryUserAccountRepository();
    authProviders = new InMemoryAuthProviderRepository(users);
    monitorings = new InMemoryMonitoringRepository();
  });

  const signIn = (allowlist: ReadonlySet<string> | null = null) =>
    new SignInWithProvider(users, authProviders, monitorings, allowlist);

  it('creates a password-less account on the first Google sign-in, then finds it again', async () => {
    const first = await signIn().handle(profile);
    const second = await signIn().handle(profile);

    expect(first).toEqual({ ok: true, value: { id: 1, email: 'helene@example.com', name: 'Hélène' } });
    expect(second).toEqual(first);
    expect(users.rows).toHaveLength(1);
    expect(users.rows[0].passwordHash).toBeNull();
  });

  it('links Google to an existing account with the same email', async () => {
    await users.insert({ email: 'helene@example.com', name: null, passwordHash: 'hashed(x)' });

    const result = await signIn().handle(profile);

    expect(result).toMatchObject({ ok: true, value: { id: 1 } });
    expect(authProviders.links).toEqual([{ userId: 1, provider: 'google', providerAccountId: 'goog-1' }]);
  });

  it('refuses a new account outside the allowlist, but never an existing one', async () => {
    const allowlist = new Set(['someone@else.com']);

    expect(await signIn(allowlist).handle(profile)).toEqual({ ok: false, error: 'EMAIL_NOT_ALLOWED' });

    await users.insert({ email: 'helene@example.com', name: null, passwordHash: null });
    expect((await signIn(allowlist).handle(profile)).ok).toBe(true);
  });

  it('gives the first account the monitorings recorded before accounts existed', async () => {
    await monitorings.insert(null, { id: ids.monitoring, startedAt: at(0) });

    await signIn().handle(profile);

    expect(monitorings.rows[0].userId).toBe(1);
  });
});
