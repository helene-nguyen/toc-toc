//~ The screen reads a monitoring as a timeline: every time in seconds since
// its start. The trace, the stats and the print all work on this shape —
// plain numbers, no dates, no API types.
import type { Intensity, Monitoring } from '../monitoringTypes';

export interface TimelineContraction {
  start: number;
  // null while the contraction goes on
  end: number | null;
  intensity: Intensity;
  // painless (Braxton-Hicks): drawn low, left out of the labour figures
  braxtonHicks: boolean;
}

export interface Timeline {
  // seconds elapsed: up to now while it runs, up to the stop afterwards
  now: number;
  running: boolean;
  // ordered by start
  contractions: TimelineContraction[];
  // ordered by time
  movements: number[];
}

export const toTimeline = (monitoring: Monitoring, now: Date): Timeline => {
  const origin = Date.parse(monitoring.startedAt);
  const seconds = (iso: string) => (Date.parse(iso) - origin) / 1000;
  return {
    now: monitoring.stoppedAt ? seconds(monitoring.stoppedAt) : Math.max(0, (now.getTime() - origin) / 1000),
    running: monitoring.stoppedAt === null,
    contractions: monitoring.contractions
      .map(({ startedAt, endedAt, intensity, braxtonHicks }) => ({
        start: seconds(startedAt),
        end: endedAt === null ? null : seconds(endedAt),
        intensity,
        braxtonHicks: braxtonHicks ?? false
      }))
      .sort((a, b) => a.start - b.start),
    movements: monitoring.movements.map(({ at }) => seconds(at)).sort((a, b) => a - b)
  };
};
