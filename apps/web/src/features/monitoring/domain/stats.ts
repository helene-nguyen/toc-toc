//~ The numbers shown beside the trace, all from the timeline.
// "Recent" means the last few contractions: the rhythm that matters is the
// one of the moment, not the average of the whole night.
import type { Timeline } from './timeline';

const mean = (values: number[]): number | null =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

// start-to-start gaps between consecutive contractions
const intervals = (starts: number[]): number[] => starts.slice(1).map((start, index) => start - starts[index]);

export interface Rhythm {
  // contractions started in the last 10 minutes
  perTenMinutes: number;
  // seconds, over the last 6 contractions (5 gaps)
  averageInterval: number | null;
  // seconds, over the last 5 finished contractions
  averageDuration: number | null;
  // seconds since the last contraction started
  sinceLast: number | null;
  movementsLastHour: number;
  // seconds since the last movement
  sinceLastMovement: number | null;
}

export const rhythm = ({ now, contractions, movements }: Timeline): Rhythm => {
  const finished = contractions.filter((contraction) => contraction.end !== null);
  const last = contractions.at(-1);
  const lastMovement = movements.at(-1);
  return {
    perTenMinutes: contractions.filter((contraction) => contraction.start >= now - 600).length,
    averageInterval: mean(intervals(contractions.slice(-6).map((contraction) => contraction.start))),
    averageDuration: mean(finished.slice(-5).map((contraction) => contraction.end! - contraction.start)),
    sinceLast: last ? now - last.start : null,
    movementsLastHour: movements.filter((at) => at >= now - 3600).length,
    sinceLastMovement: lastMovement === undefined ? null : now - lastMovement
  };
};

//~ The 5-1-1 landmark many maternity units give: contractions every 5
// minutes or less, each lasting 1 minute or more, for at least 1 hour.
// Averages over the last hour. A landmark only — the unit's advice wins.
export interface FiveOneOne {
  everyFiveMinutes: boolean;
  lastingOneMinute: boolean;
  forOneHour: boolean;
  met: boolean;
}

export const fiveOneOne = ({ now, contractions }: Timeline): FiveOneOne => {
  const lastHour = contractions.filter((contraction) => contraction.start >= now - 3600);
  const interval = mean(intervals(lastHour.map((contraction) => contraction.start)));
  const duration = mean(
    lastHour.filter((contraction) => contraction.end !== null).map((contraction) => contraction.end! - contraction.start)
  );
  const everyFiveMinutes = interval !== null && interval <= 300;
  const lastingOneMinute = duration !== null && duration >= 60;
  const forOneHour = now >= 3600;
  return { everyFiveMinutes, lastingOneMinute, forOneHour, met: everyFiveMinutes && lastingOneMinute && forOneHour };
};

//~ A whole session at a glance — for the history and the printed page
export interface SessionSummary {
  // seconds
  duration: number;
  contractionCount: number;
  // seconds, start to start, over the whole session
  averageInterval: number | null;
  // seconds, finished contractions only
  averageDuration: number | null;
  movementCount: number;
  movementsPerHour: number | null;
}

export const sessionSummary = ({ now, contractions, movements }: Timeline): SessionSummary => ({
  duration: now,
  contractionCount: contractions.length,
  averageInterval: mean(intervals(contractions.map((contraction) => contraction.start))),
  averageDuration: mean(
    contractions.filter((contraction) => contraction.end !== null).map((contraction) => contraction.end! - contraction.start)
  ),
  movementCount: movements.length,
  movementsPerHour: now > 0 ? movements.length / (now / 3600) : null
});
