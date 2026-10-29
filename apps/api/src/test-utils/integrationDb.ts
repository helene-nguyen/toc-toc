//~ Helpers for integration specs: a pool to the TEST database and cleanup.
// The test database is separate from the dev one — specs truncate tables,
// so they must never point at the database the dev server uses.
import pg from 'pg';
import { dbConfig } from '../db.js';

export const testDbConfig = () => ({
  ...dbConfig(),
  database: process.env.POSTGRES_TEST_DB ?? 'toctoc_test'
});

export const createTestPool = (): pg.Pool => new pg.Pool(testDbConfig());

//~ Wipe the data between tests — monitorings (and their taps), practice
// contractions and Google links go with their user; legacy monitorings
// without one are cleared too
export const truncateAll = async (pool: pg.Pool): Promise<void> => {
  await pool.query('TRUNCATE "user", monitoring RESTART IDENTITY CASCADE');
};

//~ A user to own the monitorings of a spec
export const insertUser = async (pool: pg.Pool, email = 'helene@example.com'): Promise<number> => {
  const { rows } = await pool.query<{ id: number }>(`INSERT INTO "user" (email) VALUES ($1) RETURNING id`, [email]);
  return rows[0].id;
};
