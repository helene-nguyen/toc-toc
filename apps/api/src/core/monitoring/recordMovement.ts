//~ Use case: record one of the baby's movements — a single moment, inside
// the monitoring. Sending the same id again replaces it.
import type { Clock } from '../clock.js';
import { err, ok, type Result } from '../result.js';
import { checkTime, type TimeError } from './timeRules.js';
import type { MonitoringRepository, Movement } from './ports.js';

export type RecordMovementError = 'MONITORING_NOT_FOUND' | TimeError;

export class RecordMovement {
  constructor(
    private readonly monitorings: MonitoringRepository,
    private readonly clock: Clock
  ) {}

  handle = async (monitoringId: string, movement: Movement): Promise<Result<Movement, RecordMovementError>> => {
    const monitoring = await this.monitorings.findById(monitoringId);
    if (!monitoring) return err('MONITORING_NOT_FOUND');

    const timeError = checkTime(monitoring, movement.at, this.clock.now());
    if (timeError) return err(timeError);

    await this.monitorings.saveMovement(monitoringId, movement);
    return ok(movement);
  };
}
