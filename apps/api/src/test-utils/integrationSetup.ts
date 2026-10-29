//~ vitest globalSetup for the integration run: make sure the test database
// exists, then bring it to the latest schema with the real migrations.
// Runs ONCE before all *.int.spec.ts files.
import pg from 'pg';
import { dbConfig } from '../db.js';
import { runMigrations } from '../migrations.js';
import { testDbConfig } from './integrationDb.js';

export default async (): Promise<void> => {
  // CREATE DATABASE cannot run inside the target database — administrate from the default one
  const admin = new pg.Client(dbConfig());
  await admin.connect();
  const { database } = testDbConfig();
  const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
  if (rows.length === 0) {
    await admin.query(`CREATE DATABASE "${database}"`);
  }
  await admin.end();

  await runMigrations(testDbConfig());
};
