//~ What the API answers — dates travel as ISO strings.

// felt pain: 1 light, 2 medium, 3 strong (no pain at all: braxtonHicks)
export type Intensity = 1 | 2 | 3;

// how high the trace goes: 'auto' follows the duration, the others cap it
export type CurveLevel = 'auto' | 'low' | 'medium' | 'high';

export interface Contraction {
  id: string;
  startedAt: string;
  // null while the contraction goes on
  endedAt: string | null;
  intensity: Intensity;
  // painless (Braxton-Hicks); missing on contractions recorded before it existed
  braxtonHicks?: boolean;
  // missing on contractions recorded before it existed: 'auto'
  curve?: CurveLevel;
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
