//~ Migration runner for development — the connection comes from our POSTGRES_* variables
// Usage: pnpm migrate (up) | pnpm migrate:down (revert last one)
import { loadEnvFile } from 'node:process';
import { dbConfig } from '../src/db.js';
import { runMigrations } from '../src/migrations.js';

try {
  loadEnvFile();
} catch {
  // no .env file — dev defaults apply
}

await runMigrations(dbConfig(), process.argv[2] === 'down' ? 'down' : 'up');
