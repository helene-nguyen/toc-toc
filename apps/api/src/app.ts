//~ Import modules
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import type pg from 'pg';
import type { CreateUserAccount } from './core/user/createUserAccount.js';
import type { AuthenticateUser } from './core/user/authenticateUser.js';
import type { SignInWithProvider } from './core/user/signInWithProvider.js';
import type { GetUser } from './core/user/getUser.js';
import { setupAuth } from './adapters/http/authentication/setupAuth.js';
import { sessionRoutes } from './adapters/http/authentication/sessionRoutes.js';
import { signUpRoute } from './adapters/http/authentication/signUpRoute.js';
import { setupGoogleOAuth, type GoogleOAuthConfig } from './adapters/http/authentication/googleOAuth.js';
import { monitoringRoutes, type MonitoringUseCases } from './adapters/http/monitoring/monitoringRoutes.js';
import { practiceRoutes, type PracticeUseCases } from './adapters/http/practice/practiceRoutes.js';

export interface AppDependencies {
  createUserAccount: CreateUserAccount;
  authenticateUser: AuthenticateUser;
  signInWithProvider: SignInWithProvider;
  getUser: GetUser;
  monitoring: MonitoringUseCases;
  practice: PracticeUseCases;
  // optional: without credentials "Sign in with Google" simply doesn't exist
  googleOAuth?: GoogleOAuthConfig;
  jwtSecret: string;
  // the built web app (apps/web/dist) — set in the Docker image, where the
  // API serves it; in development Vite serves it instead
  webDir?: string;
  pool?: pg.Pool;
}

//~ Build the Fastify instance
// Kept separate from index.ts so tests can build the app without opening a port.
// Dependencies are injected — the composition root is index.ts.
export const buildApp = ({
  createUserAccount,
  authenticateUser,
  signInWithProvider,
  getUser,
  monitoring,
  practice,
  googleOAuth,
  jwtSecret,
  webDir,
  pool
}: AppDependencies) => {
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
    app.register(fastifyCors, { origin: true, credentials: true });
  }

  setupAuth(app, jwtSecret);
  if (googleOAuth) {
    setupGoogleOAuth(app, googleOAuth, signInWithProvider);
  }

  app.register(signUpRoute(createUserAccount));
  app.register(sessionRoutes({ authenticateUser, getUser, googleEnabled: googleOAuth !== undefined }));
  app.register(monitoringRoutes(monitoring));
  app.register(practiceRoutes(practice));

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
