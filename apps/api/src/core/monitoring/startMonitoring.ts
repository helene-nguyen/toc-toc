//~ Use case: start a monitoring. Only one runs at a time per user — the
// phone shows one live trace. Starting the same id again (a retried sync) answers the
// monitoring that already exists.
import type { Clock } from '../clock.js';
import { err, ok, type Result } from '../result.js';
import { isInTheFuture } from './timeRules.js';
import type { Monitoring, MonitoringRepository, NewMonitoring } from './ports.js';

export interface StartMonitoringInput extends NewMonitoring {
  userId: number;
}

export type StartMonitoringError = 'MONITORING_ALREADY_RUNNING' | 'IN_THE_FUTURE';

export class StartMonitoring {
  constructor(
    private readonly monitorings: MonitoringRepository,
    private readonly clock: Clock
  ) {}

  handle = async ({ userId, id, startedAt }: StartMonitoringInput): Promise<Result<Monitoring, StartMonitoringError>> => {
    const existing = await this.monitorings.findById(id, userId);
    if (existing) return ok(existing);

    if (isInTheFuture(startedAt, this.clock.now())) return err('IN_THE_FUTURE');
    if (await this.monitorings.findRunning(userId)) return err('MONITORING_ALREADY_RUNNING');

    return ok(await this.monitorings.insert(userId, { id, startedAt }));
  };
}
