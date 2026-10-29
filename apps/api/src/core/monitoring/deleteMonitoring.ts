//~ Use case: delete one of the user's monitorings, with all its taps.
import { err, ok, type Result } from '../result.js';
import type { MonitoringRepository } from './ports.js';

export class DeleteMonitoring {
  constructor(private readonly monitorings: MonitoringRepository) {}

  handle = async (id: string, userId: number): Promise<Result<void, 'MONITORING_NOT_FOUND'>> =>
    (await this.monitorings.remove(id, userId)) ? ok(undefined) : err('MONITORING_NOT_FOUND');
}
