import { beforeEach, describe, expect, it } from 'vitest';
import { CreateUserAccount } from './createUserAccount.js';
import {
  FakePasswordHasher,
  InMemoryMonitoringRepository,
  InMemoryUserAccountRepository,
  at,
  ids
} from '../../test-utils/fakes.js';

const input = { email: ' Helene@Example.com ', password: 'correct-horse-battery', passwordConfirmation: 'correct-horse-battery' };

describe('CreateUserAccount', () => {
  let users: InMemoryUserAccountRepository;
  let monitorings: InMemoryMonitoringRepository;

  beforeEach(() => {
    users = new InMemoryUserAccountRepository();
    monitorings = new InMemoryMonitoringRepository();
  });

  const create = (allowlist: ReadonlySet<string> | null = null) =>
    new CreateUserAccount(users, new FakePasswordHasher(), monitorings, allowlist);

  it('creates an account with a hashed password and the email in lowercase', async () => {
    const result = await create().handle(input);

    expect(result).toEqual({ ok: true, value: { id: 1, email: 'helene@example.com', name: null } });
    expect(users.rows[0].passwordHash).toBe('hashed(correct-horse-battery)');
  });

  it('refuses mismatched passwords and an email already used, whatever its case', async () => {
    await create().handle(input);

    expect(await create().handle({ ...input, passwordConfirmation: 'other' })).toEqual({
      ok: false,
      error: 'PASSWORDS_DO_NOT_MATCH'
    });
    expect(await create().handle({ ...input, email: 'HELENE@example.com' })).toEqual({
      ok: false,
      error: 'EMAIL_ALREADY_USED'
    });
  });

  it('only lets the listed emails in when the app is shared with a few people', async () => {
    const allowlist = new Set(['helene@example.com']);

    expect((await create(allowlist).handle(input)).ok).toBe(true);
    expect(await create(allowlist).handle({ ...input, email: 'someone@else.com' })).toEqual({
      ok: false,
      error: 'EMAIL_NOT_ALLOWED'
    });
  });

  it('gives the first account the monitorings recorded before accounts existed', async () => {
    await monitorings.insert(null, { id: ids.monitoring, startedAt: at(0) });

    await create().handle(input);

    expect(monitorings.rows[0].userId).toBe(1);
  });
});
