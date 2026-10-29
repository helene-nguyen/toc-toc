//~ Use case: sign in (or up — same gesture) through Google.
// The adapter has already proven who the person is by talking to Google;
// the core only decides which account that identity maps to. In order:
//   1. this Google account is already linked            → that user
//   2. an account with the same (verified) email exists → link it to them
//   3. nobody matches                                    → create a password-less account,
//                                                          if the email is allowed
import { err, ok, type Result } from '../result.js';
import { isAllowed, normalizeEmail, type EmailAllowlist } from './emailRules.js';
import type {
  AuthProviderRepository,
  OAuthProviderName,
  UnownedMonitorings,
  UserAccount,
  UserAccountRepository
} from './ports.js';

export interface OAuthProfile {
  provider: OAuthProviderName;
  providerAccountId: string;
  // must be verified by the provider — case 2 trusts it to merge accounts
  email: string;
  name: string;
}

export class SignInWithProvider {
  constructor(
    private readonly users: UserAccountRepository,
    private readonly authProviders: AuthProviderRepository,
    private readonly monitorings: UnownedMonitorings,
    private readonly allowlist: EmailAllowlist
  ) {}

  handle = async (profile: OAuthProfile): Promise<Result<UserAccount, 'EMAIL_NOT_ALLOWED'>> => {
    const linked = await this.authProviders.findUser(profile.provider, profile.providerAccountId);
    if (linked) return ok(linked);

    const email = normalizeEmail(profile.email);
    const existing = await this.users.findByEmail(email);
    if (!existing && !isAllowed(email, this.allowlist)) return err('EMAIL_NOT_ALLOWED');

    const user = existing ?? (await this.createUser(email, profile.name));
    await this.authProviders.link(user.id, profile.provider, profile.providerAccountId);

    return ok({ id: user.id, email: user.email, name: user.name });
  };

  private createUser = async (email: string, name: string): Promise<UserAccount> => {
    const inserted = await this.users.insert({ email, name, passwordHash: null });

    if (!inserted.ok) {
      // EMAIL_ALREADY_USED: someone signed up with this email between our check
      // and the insert — the unique constraint caught it, link to that account
      return (await this.users.findByEmail(email)) as UserAccount;
    }

    await this.monitorings.adoptUnowned(inserted.value.id);
    return inserted.value;
  };
}
