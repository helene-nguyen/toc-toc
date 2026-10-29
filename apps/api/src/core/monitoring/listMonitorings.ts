//~ Use case: the history — every monitoring, newest first.
import type { MonitoringRepository, MonitoringSummary } from './ports.js';

export class ListMonitorings {
  constructor(private readonly monitorings: MonitoringRepository) {}

  handle = async (): Promise<MonitoringSummary[]> => this.monitorings.list();
}
