//~ Use case: delete a monitoring from the history, with all its taps.
import { err, ok, type Result } from '../result.js';
import type { MonitoringRepository } from './ports.js';

export class DeleteMonitoring {
  constructor(private readonly monitorings: MonitoringRepository) {}

  handle = async (id: string): Promise<Result<void, 'MONITORING_NOT_FOUND'>> =>
    (await this.monitorings.remove(id)) ? ok(undefined) : err('MONITORING_NOT_FOUND');
}
