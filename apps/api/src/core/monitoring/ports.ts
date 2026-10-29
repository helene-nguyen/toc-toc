//~ Driven ports for monitorings — one monitoring is one session of labour
// tracking: when it started and stopped, the contractions the user marked
// (start, end, felt intensity) and the baby's movements.
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
  // with its contractions and movements; null when unknown
  findById(id: string): Promise<Monitoring | null>;
  // the one monitoring without a stop time, if any
  findRunning(): Promise<Monitoring | null>;
  // newest first
  list(): Promise<MonitoringSummary[]>;
  insert(monitoring: NewMonitoring): Promise<Monitoring>;
  stop(id: string, stoppedAt: Date): Promise<void>;
  // takes its contractions and movements with it; false when there was nothing to delete
  remove(id: string): Promise<boolean>;
  // insert, or replace the one with the same id — the core has checked the rules
  saveContraction(monitoringId: string, contraction: Contraction): Promise<void>;
  removeContraction(monitoringId: string, contractionId: string): Promise<boolean>;
  // insert, or replace the one with the same id
  saveMovement(monitoringId: string, movement: Movement): Promise<void>;
  removeMovement(monitoringId: string, movementId: string): Promise<boolean>;
}
