//~ What the API answers — dates travel as ISO strings.

// felt intensity: 1 light, 2 medium, 3 strong
export type Intensity = 1 | 2 | 3;

export interface Contraction {
  id: string;
  startedAt: string;
  // null while the contraction goes on
  endedAt: string | null;
  intensity: Intensity;
}

export interface Movement {
  id: string;
  at: string;
}

export interface Monitoring {
  id: string;
  startedAt: string;
  // null while it runs
  stoppedAt: string | null;
  contractions: Contraction[];
  movements: Movement[];
}

export interface MonitoringSummary {
  id: string;
  startedAt: string;
  stoppedAt: string | null;
  contractionCount: number;
  movementCount: number;
}
