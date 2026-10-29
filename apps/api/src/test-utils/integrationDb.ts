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

//~ Wipe the data between tests — contractions and movements go with their monitoring
export const truncateAll = async (pool: pg.Pool): Promise<void> => {
  await pool.query('TRUNCATE monitoring CASCADE');
};
