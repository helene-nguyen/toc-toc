//~ Driven ports for monitorings — one monitoring is one session of labour
// tracking: when it started and stopped, the contractions the user marked
// (start, end, felt intensity) and the baby's movements. Every monitoring
// belongs to one user; someone else's reads as unknown (never "forbidden",
// which would tell it exists).
// Ids are UUIDs made by the phone: a tap is saved on the device first and
// synced later, so the same request may arrive twice — it must land once.

// felt intensity: 1 light, 2 medium, 3 strong
export type Intensity = 1 | 2 | 3;

export interface Contraction {
  id: string;
  startedAt: Date;
  // null while the contraction goes on
  endedAt: Date | null;
  intensity: Intensity;
  // a painless one (Braxton-Hicks): drawn low, left out of the labour figures
  braxtonHicks: boolean;
}

export interface Movement {
  id: string;
  at: Date;
}

export interface Monitoring {
  id: string;
  startedAt: Date;
  // null while it runs
  stoppedAt: Date | null;
  // ordered by start
  contractions: Contraction[];
  // ordered by time
  movements: Movement[];
}

//~ A monitoring as the history lists it
export interface MonitoringSummary {
  id: string;
  startedAt: Date;
  stoppedAt: Date | null;
  contractionCount: number;
  movementCount: number;
}

export interface NewMonitoring {
  id: string;
  startedAt: Date;
}

export interface MonitoringRepository {
  // with its contractions and movements; null when unknown or someone else's
  findById(id: string, userId: number): Promise<Monitoring | null>;
  // the user's one monitoring without a stop time, if any
  findRunning(userId: number): Promise<Monitoring | null>;
  // the user's, newest first
  list(userId: number): Promise<MonitoringSummary[]>;
  insert(userId: number, monitoring: NewMonitoring): Promise<Monitoring>;
  // the methods below act on a monitoring the core has already found for its user
  stop(id: string, stoppedAt: Date): Promise<void>;
  // takes its contractions and movements with it; false when there was nothing to delete
  remove(id: string, userId: number): Promise<boolean>;
  // insert, or replace the one with the same id — the core has checked the rules
  saveContraction(monitoringId: string, contraction: Contraction): Promise<void>;
  removeContraction(monitoringId: string, contractionId: string): Promise<boolean>;
  // insert, or replace the one with the same id
  saveMovement(monitoringId: string, movement: Movement): Promise<void>;
  removeMovement(monitoringId: string, movementId: string): Promise<boolean>;
  // monitorings recorded before accounts existed go to `userId`
  adoptUnowned(userId: number): Promise<void>;
}
