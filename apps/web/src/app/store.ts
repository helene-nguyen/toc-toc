//~ Redux store: the API slice, and the live monitoring with its outbox.
// The monitoring slice is saved in localStorage after every change and read
// back at start-up — the phone keeps the session through reloads, a closed
// tab or a flat battery, and sends what's left once it's back.
import { configureStore } from '@reduxjs/toolkit';
import { api } from './api';
import {
  initialMonitoringState,
  monitoringReducer,
  type MonitoringState
} from '../features/monitoring/monitoringSlice';

const STORAGE_KEY = 'toc-toc.monitoring.v1';

// storage can be missing or refuse (private browsing): start empty then
const loadMonitoring = (): MonitoringState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...initialMonitoringState, ...JSON.parse(saved), syncError: null } : initialMonitoringState;
  } catch {
    return initialMonitoringState;
  }
};

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    monitoring: monitoringReducer
  },
  preloadedState: { monitoring: loadMonitoring() },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware)
});

let saved = store.getState().monitoring;
store.subscribe(() => {
  const monitoring = store.getState().monitoring;
  if (monitoring === saved) return;
  saved = monitoring;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(monitoring));
  } catch {
    // full or refused: the session still runs, it just won't survive a reload
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
