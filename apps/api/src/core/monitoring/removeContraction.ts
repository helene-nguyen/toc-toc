//~ Use case: remove a contraction tapped by mistake ("undo").
import { err, ok, type Result } from '../result.js';
import type { MonitoringRepository } from './ports.js';

export class RemoveContraction {
  constructor(private readonly monitorings: MonitoringRepository) {}

  handle = async (
    monitoringId: string,
    userId: number,
    contractionId: string
  ): Promise<Result<void, 'MONITORING_NOT_FOUND' | 'CONTRACTION_NOT_FOUND'>> => {
    if (!(await this.monitorings.findById(monitoringId, userId))) return err('MONITORING_NOT_FOUND');

    return (await this.monitorings.removeContraction(monitoringId, contractionId))
      ? ok(undefined)
      : err('CONTRACTION_NOT_FOUND');
  };
}
