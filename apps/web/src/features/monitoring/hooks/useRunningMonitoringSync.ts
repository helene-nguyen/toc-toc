//~ Keeps the phone's running monitoring in line with the server's (see
// domain/reconcileRunning): resumes the one running on the server after
// signing in again or on another phone, drops one the server refused.
// Runs from the app shell, whatever page is open.
import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { monitoringApi, useListMonitoringsQuery } from '../monitoringApi';
import { liveDiscarded, liveResumed } from '../monitoringSlice';
import { reconcileRunning } from '../domain/reconcileRunning';

export const useRunningMonitoringSync = () => {
  const dispatch = useAppDispatch();
  const { data: serverMonitorings } = useListMonitoringsQuery();
  const live = useAppSelector((state) => state.monitoring.live);
  const outbox = useAppSelector((state) => state.monitoring.outbox);
  // one fetch at a time for the monitoring being resumed
  const resuming = useRef<string | null>(null);

  useEffect(() => {
    if (!serverMonitorings) return;
    const decision = reconcileRunning(live, outbox, serverMonitorings);
    if (!decision) return;

    if (decision.action === 'discard') {
      dispatch(liveDiscarded(decision.id));
      return;
    }
    if (resuming.current === decision.id) return;
    resuming.current = decision.id;
    dispatch(monitoringApi.endpoints.getMonitoring.initiate(decision.id, { subscribe: false, forceRefetch: true }))
      .unwrap()
      .then((monitoring) => dispatch(liveResumed(monitoring)))
      .catch(() => {
        // offline or gone: the next list refresh tries again
      })
      .finally(() => (resuming.current = null));
  }, [serverMonitorings, live, outbox, dispatch]);
};
