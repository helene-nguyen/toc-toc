import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PostgresUserAccountRepository } from './userAccountRepository.js';
import { PostgresAuthProviderRepository } from './authProviderRepository.js';
import { createTestPool, truncateAll } from '../../test-utils/integrationDb.js';

describe('PostgresUserAccountRepository and PostgresAuthProviderRepository', () => {
  const pool = createTestPool();
  const users = new PostgresUserAccountRepository(pool);
  const authProviders = new PostgresAuthProviderRepository(pool);

  beforeEach(async () => {
    await truncateAll(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('stores an account and finds it by email or id', async () => {
    const inserted = await users.insert({ email: 'helene@example.com', name: null, passwordHash: 'scrypt$x' });

    expect(inserted).toEqual({ ok: true, value: { id: 1, email: 'helene@example.com', name: null } });
    expect(await users.findByEmail('helene@example.com')).toEqual({
      id: 1,
      email: 'helene@example.com',
      name: null,
      passwordHash: 'scrypt$x'
    });
    expect(await users.findById(1)).toEqual({ id: 1, email: 'helene@example.com', name: null });
    expect(await users.findById(99)).toBeNull();
  });

  it('answers EMAIL_ALREADY_USED from the unique constraint', async () => {
    await users.insert({ email: 'helene@example.com', name: null, passwordHash: null });

    expect(await users.insert({ email: 'helene@example.com', name: 'H', passwordHash: null })).toEqual({
      ok: false,
      error: 'EMAIL_ALREADY_USED'
    });
  });

  it('links a Google account once, even when the callback races', async () => {
    await users.insert({ email: 'helene@example.com', name: 'Hélène', passwordHash: null });

    await authProviders.link(1, 'google', 'goog-1');
    await authProviders.link(1, 'google', 'goog-1');

    expect(await authProviders.findUser('google', 'goog-1')).toEqual({ id: 1, email: 'helene@example.com', name: 'Hélène' });
    expect(await authProviders.findUser('google', 'goog-2')).toBeNull();
  });
});
