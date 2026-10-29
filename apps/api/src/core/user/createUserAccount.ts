//~ Use case: create an account with an email and a password (sign up).
import { err, ok, type Result } from '../result.js';
import { isAllowed, normalizeEmail, type EmailAllowlist } from './emailRules.js';
import type { PasswordHasher, UnownedMonitorings, UserAccount, UserAccountRepository } from './ports.js';

export interface SignUpInput {
  email: string;
  password: string;
  passwordConfirmation: string;
}

export type SignUpError = 'PASSWORDS_DO_NOT_MATCH' | 'EMAIL_ALREADY_USED' | 'EMAIL_NOT_ALLOWED';

export class CreateUserAccount {
  constructor(
    private readonly users: UserAccountRepository,
    private readonly hasher: PasswordHasher,
    private readonly monitorings: UnownedMonitorings,
    private readonly allowlist: EmailAllowlist
  ) {}

  handle = async (input: SignUpInput): Promise<Result<UserAccount, SignUpError>> => {
    if (input.password !== input.passwordConfirmation) return err('PASSWORDS_DO_NOT_MATCH');
    if (!isAllowed(input.email, this.allowlist)) return err('EMAIL_NOT_ALLOWED');

    const passwordHash = await this.hasher.hash(input.password);
    const inserted = await this.users.insert({ email: normalizeEmail(input.email), name: null, passwordHash });
    if (!inserted.ok) return inserted;

    await this.monitorings.adoptUnowned(inserted.value.id);
    return ok(inserted.value);
  };
}
