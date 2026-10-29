//~ Use case: the user's history — their monitorings, newest first.
import type { MonitoringRepository, MonitoringSummary } from './ports.js';

export class ListMonitorings {
  constructor(private readonly monitorings: MonitoringRepository) {}

  handle = async (userId: number): Promise<MonitoringSummary[]> => this.monitorings.list(userId);
}
