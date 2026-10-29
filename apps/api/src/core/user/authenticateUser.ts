//~ Use case: verify email + password credentials.
// Pure core: no JWT here — proving who you are (this use case) and carrying
// that proof around (tokens, cookies) are different concerns; tokens are an
// HTTP-adapter detail.
import { err, ok, type Result } from '../result.js';
import { normalizeEmail } from './emailRules.js';
import type { PasswordHasher, UserAccount, UserAccountRepository } from './ports.js';

export interface SignInInput {
  email: string;
  password: string;
}

// One single error for every failure (unknown email, wrong password,
// Google-only account): the response must not reveal whether an email exists.
export type SignInError = 'INVALID_CREDENTIALS';

export class AuthenticateUser {
  constructor(
    private readonly users: UserAccountRepository,
    private readonly hasher: PasswordHasher
  ) {}

  handle = async (input: SignInInput): Promise<Result<UserAccount, SignInError>> => {
    const user = await this.users.findByEmail(normalizeEmail(input.email));
    if (!user || user.passwordHash === null) return err('INVALID_CREDENTIALS');

    if (!(await this.hasher.compare(input.password, user.passwordHash))) return err('INVALID_CREDENTIALS');

    return ok({ id: user.id, email: user.email, name: user.name });
  };
}
