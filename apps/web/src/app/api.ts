//~ RTK Query base slice: one gateway to the Toc-Toc API, each feature
// injects its own endpoints into it (see features/monitoring/monitoringApi.ts).
// The Vite proxy (dev) and Fastify (production) keep every /api call
// same-origin, so the session cookies travel by themselves.
import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';

const rawBaseQuery = fetchBaseQuery({ baseUrl: '/api/v1' });

// calls where a 401 means "wrong credentials", not "session expired"
const NO_REFRESH = ['/signin', '/signup', '/token/refresh'];

// one refresh at a time: requests failing together all wait for the same one
let refreshing: Promise<boolean> | null = null;

//~ The access cookie lives 15 minutes: on a 401, renew the session with the
// refresh cookie (valid a month) and replay the request once
const baseQueryWithRefresh: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  const url = typeof args === 'string' ? args : args.url;

  if (result.error?.status === 401 && !NO_REFRESH.includes(url)) {
    refreshing ??= Promise.resolve(rawBaseQuery({ url: '/token/refresh', method: 'POST' }, api, extraOptions))
      .then((refresh) => !refresh.error)
      .finally(() => (refreshing = null));
    if (await refreshing) result = await rawBaseQuery(args, api, extraOptions);
  }

  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithRefresh,
  // 'Session' tag: sign-in/out invalidate it, so `me` refetches and every
  // component depending on who is signed in updates by itself.
  // 'Monitorings' covers the history list, 'Monitoring' one session —
  // mutations invalidate them and RTK Query refetches whatever is on screen.
  tagTypes: ['Session', 'Monitorings', 'Monitoring'],
  // the base slice declares no endpoint itself
  endpoints: () => ({})
});
