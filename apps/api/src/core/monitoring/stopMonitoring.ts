//~ Use case: stop a monitoring. A contraction still going on ends with it.
// The stop can't come before the last tap, or that tap would fall outside
// the monitoring. Stopping it again (a retried sync) changes nothing.
import type { Clock } from '../clock.js';
import { err, ok, type Result } from '../result.js';
import { checkTime, type TimeError } from './timeRules.js';
import type { Monitoring, MonitoringRepository } from './ports.js';

export type StopMonitoringError = 'MONITORING_NOT_FOUND' | 'BEFORE_LAST_EVENT' | Exclude<TimeError, 'AFTER_STOP'>;

// the latest moment something was tapped in the monitoring
const lastEventAt = ({ contractions, movements }: Monitoring): number =>
  Math.max(
    0,
    ...contractions.map((contraction) => (contraction.endedAt ?? contraction.startedAt).getTime()),
    ...movements.map((movement) => movement.at.getTime())
  );

export class StopMonitoring {
  constructor(
    private readonly monitorings: MonitoringRepository,
    private readonly clock: Clock
  ) {}

  handle = async (id: string, stoppedAt: Date): Promise<Result<Monitoring, StopMonitoringError>> => {
    const monitoring = await this.monitorings.findById(id);
    if (!monitoring) return err('MONITORING_NOT_FOUND');
    if (monitoring.stoppedAt) return ok(monitoring);

    const timeError = checkTime(monitoring, stoppedAt, this.clock.now());
    if (timeError === 'IN_THE_FUTURE' || timeError === 'BEFORE_START') return err(timeError);
    if (stoppedAt.getTime() < lastEventAt(monitoring)) return err('BEFORE_LAST_EVENT');

    const ongoing = monitoring.contractions.find((contraction) => contraction.endedAt === null);
    if (ongoing) await this.monitorings.saveContraction(id, { ...ongoing, endedAt: stoppedAt });
    await this.monitorings.stop(id, stoppedAt);

    return ok((await this.monitorings.findById(id))!);
  };
}
