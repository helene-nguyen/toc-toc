import { beforeEach, describe, expect, it } from 'vitest';
import { AuthenticateUser } from './authenticateUser.js';
import { FakePasswordHasher, InMemoryUserAccountRepository } from '../../test-utils/fakes.js';

describe('AuthenticateUser', () => {
  let users: InMemoryUserAccountRepository;
  let authenticateUser: AuthenticateUser;

  beforeEach(async () => {
    users = new InMemoryUserAccountRepository();
    authenticateUser = new AuthenticateUser(users, new FakePasswordHasher());
    await users.insert({ email: 'helene@example.com', name: null, passwordHash: 'hashed(correct-horse-battery)' });
    await users.insert({ email: 'google@example.com', name: 'G', passwordHash: null });
  });

  it('accepts the right password, the email in any case', async () => {
    expect(await authenticateUser.handle({ email: 'Helene@Example.com', password: 'correct-horse-battery' })).toEqual({
      ok: true,
      value: { id: 1, email: 'helene@example.com', name: null }
    });
  });

  it('answers the same error for a wrong password, an unknown email or a Google-only account', async () => {
    const invalid = { ok: false, error: 'INVALID_CREDENTIALS' };

    expect(await authenticateUser.handle({ email: 'helene@example.com', password: 'nope' })).toEqual(invalid);
    expect(await authenticateUser.handle({ email: 'nobody@example.com', password: 'x' })).toEqual(invalid);
    expect(await authenticateUser.handle({ email: 'google@example.com', password: 'x' })).toEqual(invalid);
  });
});
