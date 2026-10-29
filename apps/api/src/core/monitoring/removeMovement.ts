//~ Use case: remove a movement tapped by mistake ("undo").
import { err, ok, type Result } from '../result.js';
import type { MonitoringRepository } from './ports.js';

export class RemoveMovement {
  constructor(private readonly monitorings: MonitoringRepository) {}

  handle = async (monitoringId: string, movementId: string): Promise<Result<void, 'MOVEMENT_NOT_FOUND'>> =>
    (await this.monitorings.removeMovement(monitoringId, movementId)) ? ok(undefined) : err('MOVEMENT_NOT_FOUND');
}
