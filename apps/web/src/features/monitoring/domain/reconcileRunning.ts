//~ Which running monitoring is the real one, when the phone and the server
// disagree. The server is the reference; the phone only wins while its own
// start hasn't been sent yet (offline).
// - the server has a running monitoring the phone doesn't (signed out and
//   back in, another phone, a cleared browser) → resume it here
// - the phone runs one while the server runs another → the phone's start
//   was refused (MONITORING_ALREADY_RUNNING): drop it, then resume the
//   server's
import type { Monitoring, MonitoringSummary } from '../monitoringTypes';
import type { OutboxRequest } from '../monitoringSlice';

export type Reconciliation = { action: 'resume'; id: string } | { action: 'discard'; id: string } | null;

export const reconcileRunning = (
  live: Monitoring | null,
  outbox: OutboxRequest[],
  serverMonitorings: MonitoringSummary[]
): Reconciliation => {
  const serverRunning = serverMonitorings.find((monitoring) => monitoring.stoppedAt === null) ?? null;
  const localRunning = live && live.stoppedAt === null ? live : null;
  const startPending = localRunning !== null && outbox.some((request) => request.kind === 'start' && request.id === localRunning.id);

  if (localRunning && !startPending && serverRunning && serverRunning.id !== localRunning.id) {
    return { action: 'discard', id: localRunning.id };
  }
  // the same one stopped here: the server just hasn't received the stop yet
  if (!localRunning && serverRunning && live?.id !== serverRunning.id) {
    return { action: 'resume', id: serverRunning.id };
  }
  return null;
};
