//~ Driver adapter: the session lifecycle over HTTP.
// POST /signin issues the token pair, POST /token/refresh rotates it,
// POST /signout drops it, GET /me says who is signed in, GET /auth/providers
// tells the sign-in page whether to offer Google.
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { AuthenticateUser, SignInInput } from '../../../core/user/authenticateUser.js';
import type { GetUser } from '../../../core/user/getUser.js';
import type { TokenPayload } from './setupAuth.js';

const bodySchema = {
  type: 'object',
  required: ['email', 'password'],
  additionalProperties: false,
  properties: {
    email: { type: 'string', pattern: '^\\s*[^@\\s]+@[^@\\s]+\\.[^@\\s]+\\s*$', maxLength: 255 },
    // no minLength 8 here — sign-in must accept whatever was valid at sign-up time
    password: { type: 'string', minLength: 1, maxLength: 128 }
  }
};

const ACCESS_TOKEN_TTL = '15m';
// a month: nobody should have to sign in again on the way to the maternity unit
const REFRESH_TOKEN_TTL = '30d';
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 3600;
// the refresh token is only ever sent to the refresh endpoint, nowhere else
const REFRESH_COOKIE_PATH = '/api/v1/token';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/'
} as const;

// also used by sign-up and the Google callback — one single way to open a session
export const issueTokens = (app: FastifyInstance, reply: FastifyReply, userId: number): void => {
  const accessToken = app.jwt.sign({ sub: userId, type: 'access' }, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = app.jwt.sign({ sub: userId, type: 'refresh' }, { expiresIn: REFRESH_TOKEN_TTL });

  reply
    .setCookie('access_token', accessToken, cookieOptions)
    // a lasting cookie (not a session one): closing the browser keeps you signed in
    .setCookie('refresh_token', refreshToken, {
      ...cookieOptions,
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_TOKEN_MAX_AGE
    });
};

export const sessionRoutes =
  ({ authenticateUser, getUser, googleEnabled }: { authenticateUser: AuthenticateUser; getUser: GetUser; googleEnabled: boolean }) =>
  async (app: FastifyInstance): Promise<void> => {
    app.post<{ Body: SignInInput }>('/api/v1/signin', { schema: { body: bodySchema } }, async (request, reply) => {
      const result = await authenticateUser.handle(request.body);

      if (!result.ok) {
        return reply.status(401).send({ error: result.error });
      }

      issueTokens(app, reply, result.value.id);
      return reply.status(200).send({ user: result.value });
    });

    app.post('/api/v1/token/refresh', async (request, reply) => {
      const refreshToken = request.cookies.refresh_token;

      if (!refreshToken) {
        return reply.status(401).send({ error: 'UNAUTHORIZED' });
      }

      let payload: TokenPayload;
      try {
        payload = app.jwt.verify<TokenPayload>(refreshToken);
      } catch {
        return reply.status(401).send({ error: 'UNAUTHORIZED' });
      }

      if (payload.type !== 'refresh') {
        return reply.status(401).send({ error: 'UNAUTHORIZED' });
      }

      // rotation: a fresh pair on every refresh, so a stolen refresh token ages out
      issueTokens(app, reply, payload.sub);
      return reply.status(204).send();
    });

    app.post('/api/v1/signout', async (_request, reply) => {
      return reply
        .clearCookie('access_token', cookieOptions)
        .clearCookie('refresh_token', { ...cookieOptions, path: REFRESH_COOKIE_PATH })
        .status(204)
        .send();
    });

    app.get('/api/v1/me', { preHandler: [app.authenticate] }, async (request, reply) => {
      const result = await getUser.handle(request.user.sub);

      if (!result.ok) {
        return reply.status(401).send({ error: 'UNAUTHORIZED' });
      }

      return { user: result.value };
    });

    app.get('/api/v1/auth/providers', async () => ({ google: googleEnabled }));
  };
