//~ Import modules
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import type pg from 'pg';
import { monitoringRoutes, type MonitoringUseCases } from './adapters/http/monitoring/monitoringRoutes.js';

export interface AppDependencies {
  monitoring: MonitoringUseCases;
  // the built web app (apps/web/dist) — set in the Docker image, where the
  // API serves it; in development Vite serves it instead
  webDir?: string;
  pool?: pg.Pool;
}

//~ Build the Fastify instance
// Kept separate from index.ts so tests can build the app without opening a port.
// Dependencies are injected — the composition root is index.ts.
export const buildApp = ({ monitoring, webDir, pool }: AppDependencies) => {
  const app = Fastify({
    logger:
      process.env.NODE_ENV === 'test'
        ? false
        : {
            transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' }
          }
  });

  //~ CORS is a development convenience for REST clients on another origin.
  // The web app goes through the Vite proxy, and in production it is served
  // from the same origin, so no CORS at all.
  if (process.env.NODE_ENV !== 'production') {
    app.register(fastifyCors, { origin: true });
  }

  app.register(monitoringRoutes(monitoring));

  app.get('/health', async () => {
    let db = 'not configured';
    if (pool) {
      try {
        await pool.query('SELECT 1');
        db = 'up';
      } catch {
        db = 'down';
      }
    }
    return {
      status: 'ok',
      db,
      uptime: process.uptime()
    };
  });

  //~ The web app is a single-page app: any GET that isn't an API call or a
  // file gets index.html, and the client-side router takes it from there
  if (webDir) {
    app.register(fastifyStatic, { root: webDir });
    app.setNotFoundHandler((request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api/')) {
        return reply.sendFile('index.html');
      }
      return reply.code(404).send({ error: 'NOT_FOUND' });
    });
  }

  //~ Release db connections when the server closes
  app.addHook('onClose', async () => {
    await pool?.end();
  });

  return app;
};
