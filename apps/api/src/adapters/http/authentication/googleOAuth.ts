//~ Driver adapter: sign in with Google. @fastify/oauth2 runs the redirect
// dance (GET /api/v1/auth/google → Google → our callback); the callback
// reads the verified profile, lets the core pick the account, and opens a
// session with the same cookies as the email sign-in.
import fastifyOauth2, { type OAuth2Namespace } from '@fastify/oauth2';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { OAuthProfile, SignInWithProvider } from '../../../core/user/signInWithProvider.js';
import { issueTokens } from './sessionRoutes.js';

declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace;
  }
}

// test seam: route tests swap this for a fake instead of calling Google
export type GetProfile = (app: FastifyInstance, request: FastifyRequest) => Promise<OAuthProfile>;

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  // where the app is reached (https://…ts.net): Google sends the browser back there
  appUrl: string;
  getProfile?: GetProfile;
}

interface GoogleUserInfo {
  sub: string;
  name: string | null;
  email?: string;
  email_verified?: boolean;
}

const fetchGoogleProfile: GetProfile = async (app, request) => {
  const { token } = await app.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

  const userInfo = (await (
    await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` }
    })
  ).json()) as GoogleUserInfo;

  if (!userInfo.email || !userInfo.email_verified) {
    // an unverified email must never merge into an existing account
    throw new Error('Google account has no verified email');
  }

  return {
    provider: 'google',
    providerAccountId: userInfo.sub,
    email: userInfo.email,
    name: userInfo.name ?? userInfo.email.split('@')[0]
  };
};

export const setupGoogleOAuth = (
  app: FastifyInstance,
  config: GoogleOAuthConfig,
  signInWithProvider: SignInWithProvider
): void => {
  app.register(fastifyOauth2, {
    name: 'googleOAuth2',
    credentials: {
      client: { id: config.clientId, secret: config.clientSecret },
      auth: {
        authorizeHost: 'https://accounts.google.com',
        authorizePath: '/o/oauth2/v2/auth',
        tokenHost: 'https://www.googleapis.com',
        tokenPath: '/oauth2/v4/token'
      }
    },
    startRedirectPath: '/api/v1/auth/google',
    callbackUri: `${config.appUrl}/api/v1/auth/google/callback`,
    scope: ['openid', 'email', 'profile']
  });

  const getProfile = config.getProfile ?? fetchGoogleProfile;

  app.get('/api/v1/auth/google/callback', async (request, reply) => {
    let profile: OAuthProfile;
    try {
      profile = await getProfile(app, request);
    } catch (error) {
      // bad state, refused consent, no verified email... back to the sign-in page
      request.log.warn(error, 'google oauth callback failed');
      return reply.redirect(`${config.appUrl}/signin?error=google`);
    }

    const result = await signInWithProvider.handle(profile);
    if (!result.ok) {
      return reply.redirect(`${config.appUrl}/signin?error=not-allowed`);
    }

    issueTokens(app, reply, result.value.id);
    // back to the web app, now signed in via cookies
    return reply.redirect(config.appUrl);
  });
};
