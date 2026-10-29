//~ Use case: remove a movement tapped by mistake ("undo").
import { err, ok, type Result } from '../result.js';
import type { MonitoringRepository } from './ports.js';

export class RemoveMovement {
  constructor(private readonly monitorings: MonitoringRepository) {}

  handle = async (
    monitoringId: string,
    userId: number,
    movementId: string
  ): Promise<Result<void, 'MONITORING_NOT_FOUND' | 'MOVEMENT_NOT_FOUND'>> => {
    if (!(await this.monitorings.findById(monitoringId, userId))) return err('MONITORING_NOT_FOUND');

    return (await this.monitorings.removeMovement(monitoringId, movementId)) ? ok(undefined) : err('MOVEMENT_NOT_FOUND');
  };
}
