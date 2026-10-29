//~ Use case: one of the user's monitorings, with everything tapped during it.
import { err, ok, type Result } from '../result.js';
import type { Monitoring, MonitoringRepository } from './ports.js';

export class GetMonitoring {
  constructor(private readonly monitorings: MonitoringRepository) {}

  handle = async (id: string, userId: number): Promise<Result<Monitoring, 'MONITORING_NOT_FOUND'>> => {
    const monitoring = await this.monitorings.findById(id, userId);
    return monitoring ? ok(monitoring) : err('MONITORING_NOT_FOUND');
  };
}
