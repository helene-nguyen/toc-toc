//~ Driven adapter: AuthProviderRepository backed by PostgreSQL.
import type pg from 'pg';
import type { AuthProviderRepository, OAuthProviderName, UserAccount } from '../../core/user/ports.js';

export class PostgresAuthProviderRepository implements AuthProviderRepository {
  constructor(private readonly pool: pg.Pool) {}

  findUser = async (provider: OAuthProviderName, providerAccountId: string): Promise<UserAccount | null> => {
    const { rows } = await this.pool.query<UserAccount>(
      `SELECT u.id, u.email, u.name
       FROM auth_provider ap
       JOIN "user" u ON u.id = ap.user_id
       WHERE ap.provider = $1 AND ap.provider_account_id = $2`,
      [provider, providerAccountId]
    );
    return rows[0] ?? null;
  };

  link = async (userId: number, provider: OAuthProviderName, providerAccountId: string): Promise<void> => {
    // ON CONFLICT: two parallel callbacks for the same account may race — the
    // unique constraint keeps one row and the second insert becomes a no-op
    await this.pool.query(
      `INSERT INTO auth_provider (user_id, provider, provider_account_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (provider, provider_account_id) DO NOTHING`,
      [userId, provider, providerAccountId]
    );
  };
}
