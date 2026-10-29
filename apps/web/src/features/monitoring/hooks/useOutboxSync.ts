//~ Sends the outbox to the API, one request at a time and in order (a
// contraction can't reach the server before its monitoring does).
// - sent → removed from the queue
// - server unreachable (offline, Pi down, 5xx) → the queue waits, and tries
//   again when the phone comes back online or every 15 seconds
// - session over (401, after the base query tried to renew it) → the queue
//   waits until the person signs in again; nothing is dropped
// - refused (other 4xx) → dropped with its reason, so one bad request never
//   blocks the rest; deleting what is already gone (404) counts as done
import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import type { AppDispatch } from '../../../app/store';
import { monitoringApi } from '../monitoringApi';
import { practiceApi } from '../../practice/practiceApi';
import { requestRejected, requestSent, syncPaused, type OutboxRequest } from '../monitoringSlice';

const RETRY_MS = 15_000;

type Outcome = { sent: true } | { offline: true } | { signedOut: true } | { rejected: string };

const call = (dispatch: AppDispatch, request: OutboxRequest) => {
  const { endpoints } = monitoringApi;
  switch (request.kind) {
    case 'start':
      return dispatch(endpoints.startMonitoring.initiate({ id: request.id, startedAt: request.startedAt })).unwrap();
    case 'stop':
      return dispatch(endpoints.stopMonitoring.initiate({ id: request.id, stoppedAt: request.stoppedAt })).unwrap();
    case 'saveContraction':
      return dispatch(endpoints.saveContraction.initiate(request)).unwrap();
    case 'removeContraction':
      return dispatch(endpoints.removeContraction.initiate(request)).unwrap();
    case 'recordMovement':
      return dispatch(endpoints.recordMovement.initiate(request)).unwrap();
    case 'removeMovement':
      return dispatch(endpoints.removeMovement.initiate(request)).unwrap();
    case 'savePractice':
      return dispatch(practiceApi.endpoints.savePractice.initiate(request.contraction)).unwrap();
    case 'removePractice':
      return dispatch(practiceApi.endpoints.removePractice.initiate({ id: request.id })).unwrap();
  }
};

const send = async (dispatch: AppDispatch, request: OutboxRequest): Promise<Outcome> => {
  try {
    await call(dispatch, request);
    return { sent: true };
  } catch (caught) {
    // RTK Query rejects with { status, data }: a number for HTTP answers,
    // a string ('FETCH_ERROR', 'TIMEOUT_ERROR'…) when nothing came back
    const { status, data } = (caught ?? {}) as { status?: number | string; data?: { error?: string } };
    if (typeof status !== 'number' || status >= 500) return { offline: true };
    if (status === 401) return { signedOut: true };
    if (status === 404 && request.kind.startsWith('remove')) return { sent: true };
    return { rejected: data?.error ?? `HTTP_${status}` };
  }
};

export const useOutboxSync = () => {
  const dispatch = useAppDispatch();
  const next = useAppSelector((state) => state.monitoring.outbox[0]);
  const busy = useRef(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const again = () => setRetry((count) => count + 1);
    window.addEventListener('online', again);
    const timer = window.setInterval(again, RETRY_MS);
    return () => {
      window.removeEventListener('online', again);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!next || busy.current) return;
    busy.current = true;
    send(dispatch, next).then((outcome) => {
      busy.current = false;
      if ('sent' in outcome) dispatch(requestSent(next.seq));
      else if ('offline' in outcome) dispatch(syncPaused('OFFLINE'));
      else if ('signedOut' in outcome) dispatch(syncPaused('SIGNED_OUT'));
      else dispatch(requestRejected({ seq: next.seq, error: outcome.rejected }));
      // the queue may have changed while this one was in flight: look again
      if ('sent' in outcome || 'rejected' in outcome) setRetry((count) => count + 1);
    });
  }, [next, retry, dispatch]);
};
