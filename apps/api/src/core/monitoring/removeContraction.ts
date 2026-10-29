//~ Use case: remove a contraction tapped by mistake ("undo").
import { err, ok, type Result } from '../result.js';
import type { MonitoringRepository } from './ports.js';

export class RemoveContraction {
  constructor(private readonly monitorings: MonitoringRepository) {}

  handle = async (monitoringId: string, contractionId: string): Promise<Result<void, 'CONTRACTION_NOT_FOUND'>> =>
    (await this.monitorings.removeContraction(monitoringId, contractionId))
      ? ok(undefined)
      : err('CONTRACTION_NOT_FOUND');
}
