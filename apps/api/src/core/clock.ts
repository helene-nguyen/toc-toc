//~ Driven port: the current time.
// Injecting time (instead of calling new Date() in the core) makes every
// time-dependent rule testable: tests hand in a FakeClock and move it forward.
export interface Clock {
  now(): Date;
}
