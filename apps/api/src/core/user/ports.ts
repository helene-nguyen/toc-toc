//~ Driven ports of the user domain — who uses the app. Each person sees
// only their own monitorings; an account is opened with an email and a
// password, or through Google.
import type { Result } from '../result.js';

export interface UserAccount {
  id: number;
  email: string;
  // from Google; email/password accounts have none
  name: string | null;
}

export interface NewUserAccount {
  email: string;
  name: string | null;
  // null for accounts created through Google — they sign in without a password
  passwordHash: string | null;
}

export interface UserCredentials extends UserAccount {
  passwordHash: string | null;
}

export interface UserAccountRepository {
  // email uniqueness is the database's job — the port exposes the outcome,
  // so there is no check-then-insert race in the core
  insert(user: NewUserAccount): Promise<Result<UserAccount, 'EMAIL_ALREADY_USED'>>;
  findByEmail(email: string): Promise<UserCredentials | null>;
  findById(id: number): Promise<UserAccount | null>;
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

export type OAuthProviderName = 'google';

export interface AuthProviderRepository {
  findUser(provider: OAuthProviderName, providerAccountId: string): Promise<UserAccount | null>;
  link(userId: number, provider: OAuthProviderName, providerAccountId: string): Promise<void>;
}

//~ Monitorings recorded before accounts existed have no owner: the first
// account created takes them, so nothing recorded earlier is lost
export interface UnownedMonitorings {
  adoptUnowned(userId: number): Promise<void>;
}
