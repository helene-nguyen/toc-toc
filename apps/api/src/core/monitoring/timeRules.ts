//~ The time rules every tap follows. Times come from the phone — the moment
// of the tap is the truth, even when it reaches us minutes later — so the
// core only checks they make sense: not in the future (with a little slack
// for clocks that disagree) and inside the monitoring.
import type { Monitoring } from './ports.js';

export const CLOCK_SLACK_MS = 60_000;

export type TimeError = 'IN_THE_FUTURE' | 'BEFORE_START' | 'AFTER_STOP';

export const isInTheFuture = (at: Date, now: Date): boolean => at.getTime() > now.getTime() + CLOCK_SLACK_MS;

// why `at` can't be used in this monitoring, or null when it can
export const checkTime = (
  monitoring: Pick<Monitoring, 'startedAt' | 'stoppedAt'>,
  at: Date,
  now: Date
): TimeError | null => {
  if (isInTheFuture(at, now)) return 'IN_THE_FUTURE';
  if (at < monitoring.startedAt) return 'BEFORE_START';
  if (monitoring.stoppedAt && at > monitoring.stoppedAt) return 'AFTER_STOP';
  return null;
};
