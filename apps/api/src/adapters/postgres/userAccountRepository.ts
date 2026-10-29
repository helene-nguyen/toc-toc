//~ Driven adapter: UserAccountRepository backed by PostgreSQL.
import pg from 'pg';
import { err, ok, type Result } from '../../core/result.js';
import type { NewUserAccount, UserAccount, UserAccountRepository, UserCredentials } from '../../core/user/ports.js';

const UNIQUE_VIOLATION = '23505';

export class PostgresUserAccountRepository implements UserAccountRepository {
  constructor(private readonly pool: pg.Pool) {}

  insert = async (user: NewUserAccount): Promise<Result<UserAccount, 'EMAIL_ALREADY_USED'>> => {
    try {
      const { rows } = await this.pool.query<UserAccount>(
        `INSERT INTO "user" (email, name, password) VALUES ($1, $2, $3) RETURNING id, email, name`,
        [user.email, user.name, user.passwordHash]
      );
      return ok(rows[0]);
    } catch (error) {
      if (error instanceof pg.DatabaseError && error.code === UNIQUE_VIOLATION) {
        return err('EMAIL_ALREADY_USED');
      }
      throw error;
    }
  };

  findByEmail = async (email: string): Promise<UserCredentials | null> => {
    const { rows } = await this.pool.query<UserCredentials>(
      `SELECT id, email, name, password AS "passwordHash" FROM "user" WHERE email = $1`,
      [email]
    );
    return rows[0] ?? null;
  };

  findById = async (id: number): Promise<UserAccount | null> => {
    const { rows } = await this.pool.query<UserAccount>(`SELECT id, email, name FROM "user" WHERE id = $1`, [id]);
    return rows[0] ?? null;
  };
}
