//~ App-level tests: build the whole HTTP app with in-memory fakes —
// no database, no open port, runs anywhere (CI included).
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildTestApp } from './test-utils/buildTestApp.js';

describe('GET /health', () => {
  it('returns ok, and reports the db as not configured when no pool is injected', async () => {
    const { app } = buildTestApp();

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok', db: 'not configured' });
    await app.close();
  });
});

describe('serving the web app', () => {
  const webDir = () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'toc-toc-web-'));
    writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>Toc-Toc</title>');
    return dir;
  };

  it('answers index.html for the client-side routes', async () => {
    const { app } = buildTestApp({ webDir: webDir() });

    const response = await app.inject({ method: 'GET', url: '/sessions/123' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Toc-Toc');
    await app.close();
  });

  it('keeps a JSON 404 for unknown API routes', async () => {
    const { app } = buildTestApp({ webDir: webDir() });

    const response = await app.inject({ method: 'GET', url: '/api/v1/nothing' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'NOT_FOUND' });
    await app.close();
  });
});
