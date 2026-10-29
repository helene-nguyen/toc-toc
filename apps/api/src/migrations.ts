//~ Bring a database to the latest schema with node-pg-migrate.
// Used by `pnpm migrate` in development, by the integration test setup, and
// at start-up in the Docker image (RUN_MIGRATIONS=true) — the Pi never needs
// a separate migration step. The migration files stay TypeScript: tsx loads
// them in development, Node's own type stripping in the image.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runner } from 'node-pg-migrate';
import type { DbConfig } from './db.js';

// apps/api/migrations — the same folder seen from src/ and from dist/
const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

export const runMigrations = async (databaseUrl: DbConfig, direction: 'up' | 'down' = 'up'): Promise<void> => {
  await runner({
    databaseUrl,
    dir: migrationsDir,
    migrationsTable: 'pgmigrations',
    direction,
    count: direction === 'up' ? Infinity : 1
  });
};
