//~ Import modules
import { loadEnvFile } from 'node:process';
import { buildApp } from './app.js';
import { createPool, dbConfig } from './db.js';
import { runMigrations } from './migrations.js';
import { CreateUserAccount } from './core/user/createUserAccount.js';
import { AuthenticateUser } from './core/user/authenticateUser.js';
import { SignInWithProvider } from './core/user/signInWithProvider.js';
import { GetUser } from './core/user/getUser.js';
import { normalizeEmail } from './core/user/emailRules.js';
import { StartMonitoring } from './core/monitoring/startMonitoring.js';
import { StopMonitoring } from './core/monitoring/stopMonitoring.js';
import { GetMonitoring } from './core/monitoring/getMonitoring.js';
import { ListMonitorings } from './core/monitoring/listMonitorings.js';
import { DeleteMonitoring } from './core/monitoring/deleteMonitoring.js';
import { SaveContraction } from './core/monitoring/saveContraction.js';
import { RemoveContraction } from './core/monitoring/removeContraction.js';
import { RecordMovement } from './core/monitoring/recordMovement.js';
import { RemoveMovement } from './core/monitoring/removeMovement.js';
import { SavePracticeContraction } from './core/practice/savePracticeContraction.js';
import { RemovePracticeContraction } from './core/practice/removePracticeContraction.js';
import { ListPracticeHistory } from './core/practice/listPracticeHistory.js';
import { PostgresMonitoringRepository } from './adapters/postgres/monitoringRepository.js';
import { PostgresPracticeContractionRepository } from './adapters/postgres/practiceContractionRepository.js';
import { PostgresUserAccountRepository } from './adapters/postgres/userAccountRepository.js';
import { PostgresAuthProviderRepository } from './adapters/postgres/authProviderRepository.js';
import { ScryptPasswordHasher } from './adapters/security/scryptPasswordHasher.js';
import { SystemClock } from './adapters/systemClock.js';

//~ Load environment (optional — db.ts falls back to the dev defaults)
try {
  loadEnvFile();
} catch {
  // no .env file yet — defaults apply
}

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET is required — set it in .env (see .env.example)');
}

//~ The Docker image migrates on start, so updating the Pi is just pulling a new image
if (process.env.RUN_MIGRATIONS === 'true') {
  await runMigrations(dbConfig());
}

//~ Composition root: build every adapter and use case here, inject them, launch
const PORT = Number(process.env.PORT ?? 4210);
// where people reach the app — Google sends them back there after sign-in
const appUrl = (process.env.APP_URL ?? `http://localhost:${PORT}`).replace(/\/$/, '');
// ALLOWED_EMAILS="a@x.fr, b@y.fr": only these may open an account; unset, anyone can
const allowlist = process.env.ALLOWED_EMAILS?.trim()
  ? new Set(process.env.ALLOWED_EMAILS.split(',').map(normalizeEmail).filter(Boolean))
  : null;

const pool = createPool();
const clock = new SystemClock();
const monitorings = new PostgresMonitoringRepository(pool);
const users = new PostgresUserAccountRepository(pool);
const hasher = new ScryptPasswordHasher();
const practice = new PostgresPracticeContractionRepository(pool);

const app = buildApp({
  createUserAccount: new CreateUserAccount(users, hasher, monitorings, allowlist),
  authenticateUser: new AuthenticateUser(users, hasher),
  signInWithProvider: new SignInWithProvider(users, new PostgresAuthProviderRepository(pool), monitorings, allowlist),
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
  practice: {
    savePracticeContraction: new SavePracticeContraction(practice, clock),
    removePracticeContraction: new RemovePracticeContraction(practice),
    listPracticeHistory: new ListPracticeHistory(practice)
  },
  googleOAuth:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, appUrl }
      : undefined,
  jwtSecret,
  webDir: process.env.WEB_DIR,
  pool
});

if (!process.env.GOOGLE_CLIENT_ID) {
  app.log.warn('GOOGLE_CLIENT_ID/SECRET not set — Google sign-in disabled (see .env.example)');
}

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
