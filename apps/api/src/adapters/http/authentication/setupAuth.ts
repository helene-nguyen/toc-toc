//~ Driver-adapter plumbing: cookies, JWT signing/verification, and the auth guard.
// Token mechanics live entirely on the HTTP side — the core only ever sees
// "authenticate these credentials" (AuthenticateUser).
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export interface TokenPayload {
  sub: number;
  type: 'access' | 'refresh';
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: TokenPayload;
    user: TokenPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const setupAuth = (app: FastifyInstance, jwtSecret: string): void => {
  app.register(fastifyCookie);
  app.register(fastifyJwt, {
    secret: jwtSecret,
    // read the access token from the httpOnly cookie, never from a header —
    // the browser attaches it automatically and scripts cannot steal it
    cookie: { cookieName: 'access_token', signed: false }
  });

  // Route guard: add `{ preHandler: [app.authenticate] }` to protect a route.
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify({ onlyCookie: true });
      if (request.user.type !== 'access') {
        throw new Error('refresh token used as access token');
      }
    } catch {
      await reply.status(401).send({ error: 'UNAUTHORIZED' });
    }
  });
};
