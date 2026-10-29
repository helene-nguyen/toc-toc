import { defineConfig } from 'vitest/config';

//~ Default (unit) run: everything except *.int.spec.ts — those need a real
// PostgreSQL and run separately via `pnpm test:integration`.
export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.int.spec.ts']
  }
});
