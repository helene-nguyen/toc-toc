//~ One place to wire the whole app with fakes for route tests.
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { CreateUserAccount } from '../core/user/createUserAccount.js';
import { AuthenticateUser } from '../core/user/authenticateUser.js';
import { SignInWithProvider, type OAuthProfile } from '../core/user/signInWithProvider.js';
import { GetUser } from '../core/user/getUser.js';
import { StartMonitoring } from '../core/monitoring/startMonitoring.js';
import { StopMonitoring } from '../core/monitoring/stopMonitoring.js';
import { GetMonitoring } from '../core/monitoring/getMonitoring.js';
import { ListMonitorings } from '../core/monitoring/listMonitorings.js';
import { DeleteMonitoring } from '../core/monitoring/deleteMonitoring.js';
import { SaveContraction } from '../core/monitoring/saveContraction.js';
import { RemoveContraction } from '../core/monitoring/removeContraction.js';
import { RecordMovement } from '../core/monitoring/recordMovement.js';
import { RemoveMovement } from '../core/monitoring/removeMovement.js';
import {
  FakeClock,
  FakePasswordHasher,
  InMemoryAuthProviderRepository,
  InMemoryMonitoringRepository,
  InMemoryUserAccountRepository,
  at
} from './fakes.js';

export const fakeGoogleProfile: OAuthProfile = {
  provider: 'google',
  providerAccountId: 'goog-67890',
  email: 'helene@example.com',
  name: 'Hélène'
};

interface TestAppOptions {
  webDir?: string;
  allowedEmails?: string[];
  // what the fake Google answers; null for a failed callback
  googleProfile?: OAuthProfile | null;
}

export const buildTestApp = ({ webDir, allowedEmails, googleProfile = fakeGoogleProfile }: TestAppOptions = {}) => {
  const clock = new FakeClock(at(60));
  const monitorings = new InMemoryMonitoringRepository();
  const users = new InMemoryUserAccountRepository();
  const authProviders = new InMemoryAuthProviderRepository(users);
  const hasher = new FakePasswordHasher();
  const allowlist = allowedEmails ? new Set(allowedEmails) : null;

  const app = buildApp({
    createUserAccount: new CreateUserAccount(users, hasher, monitorings, allowlist),
    authenticateUser: new AuthenticateUser(users, hasher),
    signInWithProvider: new SignInWithProvider(users, authProviders, monitorings, allowlist),
    getUser: new GetUser(users),
    monitoring: {
      startMonitoring: new StartMonitoring(monitorings, clock),
      stopMonitoring: new StopMonitoring(monitorings, clock),
      getMonitoring: new GetMonitoring(monitorings),
      listMonitorings: new ListMonitorings(monitorings),
      deleteMonitoring: new DeleteMonitoring(monitorings),
      saveContraction: new SaveContraction(monitorings, clock),
      removeContraction: new RemoveContraction(monitorings),
      recordMovement: new RecordMovement(monitorings, clock),
      removeMovement: new RemoveMovement(monitorings)
    },
    googleOAuth: {
      clientId: 'test-google-client-id',
      clientSecret: 'test-google-client-secret',
      appUrl: 'http://localhost:4210',
      // never talk to Google in tests — the seam returns a canned profile
      getProfile: async () => {
        if (!googleProfile) throw new Error('consent refused');
        return googleProfile;
      }
    },
    jwtSecret: 'test-secret',
    webDir
  });

  return { app, clock, monitorings, users, authProviders };
};

//~ Sign up through the real route and keep the session cookies
export const signUp = async (app: FastifyInstance, email = 'helene@example.com') => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/signup',
    body: { email, password: 'correct-horse-battery', passwordConfirmation: 'correct-horse-battery' }
  });
  const accessToken = response.cookies.find((cookie) => cookie.name === 'access_token')!.value;
  return { access_token: accessToken };
};
