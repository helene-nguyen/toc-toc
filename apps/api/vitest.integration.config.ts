import { defineConfig } from 'vitest/config';

//~ Integration run: only the *.int.spec.ts files, against a real PostgreSQL
// (local docker compose, or the service container in CI). The global setup
// creates the test database and migrates it; the spec files share that
// database and truncate it between tests, so they must run one at a time.
export default defineConfig({
  test: {
    include: ['**/*.int.spec.ts'],
    globalSetup: ['src/test-utils/integrationSetup.ts'],
    fileParallelism: false,
    testTimeout: 15000
  }
});
