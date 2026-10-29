//~ In-memory implementations of the driven ports, for unit and route tests.
// Same contracts as the real adapters, no database needed.
import { err, ok, type Result } from '../core/result.js';
import type { Clock } from '../core/clock.js';
import type {
  PracticeContraction,
  PracticeContractionRepository,
  PracticeEntry
} from '../core/practice/ports.js';
import type {
  AuthProviderRepository,
  NewUserAccount,
  OAuthProviderName,
  PasswordHasher,
  UserAccount,
  UserAccountRepository,
  UserCredentials
} from '../core/user/ports.js';
import type {
  Contraction,
  Monitoring,
  MonitoringRepository,
  MonitoringSummary,
  Movement,
  NewMonitoring
} from '../core/monitoring/ports.js';

export class FakeClock implements Clock {
  constructor(public current = new Date('2026-10-29T20:00:00Z')) {}

  now = (): Date => new Date(this.current);

  advance = (ms: number): void => {
    this.current = new Date(this.current.getTime() + ms);
  };
}

const byTime = <T>(time: (item: T) => Date) => (a: T, b: T) => time(a).getTime() - time(b).getTime();

// a monitoring as stored: with its owner (null before accounts existed)
type MonitoringRow = Monitoring & { userId: number | null };

export class InMemoryMonitoringRepository implements MonitoringRepository {
  readonly rows: MonitoringRow[] = [];

  // a copy, like a fresh read from the database: callers can't mutate the store
  private read = ({ id, startedAt, stoppedAt, contractions, movements }: MonitoringRow): Monitoring => ({
    id,
    startedAt,
    stoppedAt,
    contractions: [...contractions].sort(byTime((contraction) => contraction.startedAt)),
    movements: [...movements].sort(byTime((movement) => movement.at))
  });

  findById = async (id: string, userId: number): Promise<Monitoring | null> => {
    const row = this.rows.find((monitoring) => monitoring.id === id && monitoring.userId === userId);
    return row ? this.read(row) : null;
  };

  findRunning = async (userId: number): Promise<Monitoring | null> => {
    const row = this.rows.find((monitoring) => monitoring.userId === userId && monitoring.stoppedAt === null);
    return row ? this.read(row) : null;
  };

  list = async (userId: number): Promise<MonitoringSummary[]> =>
    this.rows
      .filter((monitoring) => monitoring.userId === userId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .map(({ id, startedAt, stoppedAt, contractions, movements }) => ({
        id,
        startedAt,
        stoppedAt,
        contractionCount: contractions.length,
        movementCount: movements.length
      }));

  insert = async (userId: number | null, { id, startedAt }: NewMonitoring): Promise<Monitoring> => {
    const row: MonitoringRow = { id, userId, startedAt, stoppedAt: null, contractions: [], movements: [] };
    this.rows.push(row);
    return this.read(row);
  };

  stop = async (id: string, stoppedAt: Date): Promise<void> => {
    const row = this.rows.find((monitoring) => monitoring.id === id);
    if (row) row.stoppedAt = stoppedAt;
  };

  remove = async (id: string, userId: number): Promise<boolean> => {
    const index = this.rows.findIndex((monitoring) => monitoring.id === id && monitoring.userId === userId);
    if (index === -1) return false;
    this.rows.splice(index, 1);
    return true;
  };

  saveContraction = async (monitoringId: string, contraction: Contraction): Promise<void> => {
    const row = this.rows.find((monitoring) => monitoring.id === monitoringId);
    if (!row) return;
    row.contractions = [...row.contractions.filter((other) => other.id !== contraction.id), { ...contraction }];
  };

  removeContraction = async (monitoringId: string, contractionId: string): Promise<boolean> => {
    const row = this.rows.find((monitoring) => monitoring.id === monitoringId);
    if (!row || !row.contractions.some((contraction) => contraction.id === contractionId)) return false;
    row.contractions = row.contractions.filter((contraction) => contraction.id !== contractionId);
    return true;
  };

  saveMovement = async (monitoringId: string, movement: Movement): Promise<void> => {
    const row = this.rows.find((monitoring) => monitoring.id === monitoringId);
    if (!row) return;
    row.movements = [...row.movements.filter((other) => other.id !== movement.id), { ...movement }];
  };

  removeMovement = async (monitoringId: string, movementId: string): Promise<boolean> => {
    const row = this.rows.find((monitoring) => monitoring.id === monitoringId);
    if (!row || !row.movements.some((movement) => movement.id === movementId)) return false;
    row.movements = row.movements.filter((movement) => movement.id !== movementId);
    return true;
  };

  adoptUnowned = async (userId: number): Promise<void> => {
    for (const row of this.rows) if (row.userId === null) row.userId = userId;
  };
}

export class InMemoryUserAccountRepository implements UserAccountRepository {
  readonly rows: UserCredentials[] = [];

  insert = async (user: NewUserAccount): Promise<Result<UserAccount, 'EMAIL_ALREADY_USED'>> => {
    if (this.rows.some((row) => row.email === user.email)) return err('EMAIL_ALREADY_USED');
    const row = { id: this.rows.length + 1, ...user };
    this.rows.push(row);
    return ok({ id: row.id, email: row.email, name: row.name });
  };

  findByEmail = async (email: string): Promise<UserCredentials | null> =>
    this.rows.find((row) => row.email === email) ?? null;

  findById = async (id: number): Promise<UserAccount | null> => {
    const row = this.rows.find((candidate) => candidate.id === id);
    return row ? { id: row.id, email: row.email, name: row.name } : null;
  };
}

export class InMemoryAuthProviderRepository implements AuthProviderRepository {
  readonly links: { userId: number; provider: OAuthProviderName; providerAccountId: string }[] = [];

  constructor(private readonly users: InMemoryUserAccountRepository) {}

  findUser = async (provider: OAuthProviderName, providerAccountId: string): Promise<UserAccount | null> => {
    const link = this.links.find((l) => l.provider === provider && l.providerAccountId === providerAccountId);
    return link ? this.users.findById(link.userId) : null;
  };

  link = async (userId: number, provider: OAuthProviderName, providerAccountId: string): Promise<void> => {
    this.links.push({ userId, provider, providerAccountId });
  };
}

export class FakePasswordHasher implements PasswordHasher {
  hash = async (plain: string): Promise<string> => `hashed(${plain})`;
  compare = async (plain: string, hash: string): Promise<boolean> => hash === `hashed(${plain})`;
}

//~ Practice contractions on their own, plus — for the history — the painless
// contractions of the user's monitorings, read from the monitoring fake
export class InMemoryPracticeContractionRepository implements PracticeContractionRepository {
  readonly rows: (PracticeContraction & { userId: number })[] = [];

  constructor(private readonly monitorings: InMemoryMonitoringRepository) {}

  findOngoing = async (userId: number): Promise<PracticeContraction | null> => {
    const row = this.rows.find((candidate) => candidate.userId === userId && candidate.endedAt === null);
    return row ? { id: row.id, startedAt: row.startedAt, endedAt: row.endedAt } : null;
  };

  save = async (userId: number, contraction: PracticeContraction): Promise<void> => {
    const existing = this.rows.find((row) => row.id === contraction.id);
    if (existing && existing.userId !== userId) return;
    if (existing) Object.assign(existing, contraction);
    else this.rows.push({ ...contraction, userId });
  };

  remove = async (id: string, userId: number): Promise<boolean> => {
    const index = this.rows.findIndex((row) => row.id === id && row.userId === userId);
    if (index === -1) return false;
    this.rows.splice(index, 1);
    return true;
  };

  history = async (userId: number): Promise<PracticeEntry[]> => {
    const own = this.rows
      .filter((row) => row.userId === userId)
      .map(({ id, startedAt, endedAt }) => ({ id, startedAt, endedAt, monitoringId: null }));
    const marked = this.monitorings.rows
      .filter((monitoring) => monitoring.userId === userId)
      .flatMap((monitoring) =>
        monitoring.contractions
          .filter((contraction) => contraction.braxtonHicks)
          .map(({ id, startedAt, endedAt }) => ({ id, startedAt, endedAt, monitoringId: monitoring.id }))
      );
    return [...own, ...marked].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  };
}

//~ Fixed ids and times for readable specs
export const ids = {
  monitoring: '0b6f2c1e-6d1a-4c3e-9a51-3f2a1b0c9d01',
  other: '0b6f2c1e-6d1a-4c3e-9a51-3f2a1b0c9d02',
  contraction: '5a1e9c7b-2f40-4b8e-8d3c-71c2a9e4f001',
  contraction2: '5a1e9c7b-2f40-4b8e-8d3c-71c2a9e4f002',
  movement: '9d3b7a51-8e2c-4f6a-b1d4-0c5e7f9a2001',
  practice: '3c8e1f20-7b4d-4a9e-9f61-2d5c8b0a7001',
  practice2: '3c8e1f20-7b4d-4a9e-9f61-2d5c8b0a7002'
};

// minutes after 2026-10-29 20:00 UTC — the FakeClock's "now"
export const at = (minutes: number): Date => new Date(Date.UTC(2026, 9, 29, 20, 0, 0) + minutes * 60_000);
