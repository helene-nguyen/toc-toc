//~ Driven adapter: the real wall clock.
import type { Clock } from '../core/clock.js';

export class SystemClock implements Clock {
  now = (): Date => new Date();
}
