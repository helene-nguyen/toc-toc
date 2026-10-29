//~ In-memory implementations of the driven ports, for unit and route tests.
// Same contracts as the real adapters, no database needed.
import type { Clock } from '../core/clock.js';
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

export class InMemoryMonitoringRepository implements MonitoringRepository {
  readonly rows: Monitoring[] = [];

  // a copy, like a fresh read from the database: callers can't mutate the store
  private read = (row: Monitoring): Monitoring => ({
    ...row,
    contractions: [...row.contractions].sort(byTime((contraction) => contraction.startedAt)),
    movements: [...row.movements].sort(byTime((movement) => movement.at))
  });

  findById = async (id: string): Promise<Monitoring | null> => {
    const row = this.rows.find((monitoring) => monitoring.id === id);
    return row ? this.read(row) : null;
  };

  findRunning = async (): Promise<Monitoring | null> => {
    const row = this.rows.find((monitoring) => monitoring.stoppedAt === null);
    return row ? this.read(row) : null;
  };

  list = async (): Promise<MonitoringSummary[]> =>
    [...this.rows]
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .map(({ id, startedAt, stoppedAt, contractions, movements }) => ({
        id,
        startedAt,
        stoppedAt,
        contractionCount: contractions.length,
        movementCount: movements.length
      }));

  insert = async ({ id, startedAt }: NewMonitoring): Promise<Monitoring> => {
    const row: Monitoring = { id, startedAt, stoppedAt: null, contractions: [], movements: [] };
    this.rows.push(row);
    return this.read(row);
  };

  stop = async (id: string, stoppedAt: Date): Promise<void> => {
    const row = this.rows.find((monitoring) => monitoring.id === id);
    if (row) row.stoppedAt = stoppedAt;
  };

  remove = async (id: string): Promise<boolean> => {
    const index = this.rows.findIndex((monitoring) => monitoring.id === id);
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
}

//~ Fixed ids and times for readable specs
export const ids = {
  monitoring: '0b6f2c1e-6d1a-4c3e-9a51-3f2a1b0c9d01',
  other: '0b6f2c1e-6d1a-4c3e-9a51-3f2a1b0c9d02',
  contraction: '5a1e9c7b-2f40-4b8e-8d3c-71c2a9e4f001',
  contraction2: '5a1e9c7b-2f40-4b8e-8d3c-71c2a9e4f002',
  movement: '9d3b7a51-8e2c-4f6a-b1d4-0c5e7f9a2001'
};

// minutes after 2026-10-29 20:00 UTC — the FakeClock's "now"
export const at = (minutes: number): Date => new Date(Date.UTC(2026, 9, 29, 20, 0, 0) + minutes * 60_000);
