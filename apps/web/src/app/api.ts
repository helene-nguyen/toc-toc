//~ RTK Query base slice: one gateway to the Toc-Toc API, each feature
// injects its own endpoints into it (see features/monitoring/monitoringApi.ts).
// The Vite proxy (dev) and Fastify (production) keep every /api call same-origin.
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v1' }),
  // 'Monitorings' covers the history list, 'Monitoring' one session —
  // mutations invalidate them and RTK Query refetches whatever is on screen.
  tagTypes: ['Monitorings', 'Monitoring'],
  // the base slice declares no endpoint itself
  endpoints: () => ({})
});
