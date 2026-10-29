//~ Monitoring endpoints, injected into the base API slice. Taps are PUT with
// an id made here (crypto.randomUUID): the offline queue can replay them.
import { api } from '../../app/api';
import type { Contraction, Monitoring, MonitoringSummary, Movement } from './monitoringTypes';

export const monitoringApi = api.injectEndpoints({
  endpoints: (build) => ({
    listMonitorings: build.query<MonitoringSummary[], void>({
      query: () => '/monitorings',
      transformResponse: (response: { monitorings: MonitoringSummary[] }) => response.monitorings,
      providesTags: ['Monitorings']
    }),
    getMonitoring: build.query<Monitoring, string>({
      query: (id) => `/monitorings/${id}`,
      transformResponse: (response: { monitoring: Monitoring }) => response.monitoring,
      providesTags: (_result, _error, id) => [{ type: 'Monitoring', id }]
    }),
    startMonitoring: build.mutation<Monitoring, { id: string; startedAt: string }>({
      query: (body) => ({ url: '/monitorings', method: 'POST', body }),
      transformResponse: (response: { monitoring: Monitoring }) => response.monitoring,
      invalidatesTags: ['Monitorings']
    }),
    stopMonitoring: build.mutation<Monitoring, { id: string; stoppedAt: string }>({
      query: ({ id, stoppedAt }) => ({ url: `/monitorings/${id}/stop`, method: 'POST', body: { stoppedAt } }),
      transformResponse: (response: { monitoring: Monitoring }) => response.monitoring,
      invalidatesTags: (_result, _error, { id }) => ['Monitorings', { type: 'Monitoring', id }]
    }),
    deleteMonitoring: build.mutation<void, string>({
      query: (id) => ({ url: `/monitorings/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Monitorings', 'Practice']
    }),
    saveContraction: build.mutation<Contraction, { monitoringId: string; contraction: Contraction }>({
      query: ({ monitoringId, contraction: { id, ...body } }) => ({
        url: `/monitorings/${monitoringId}/contractions/${id}`,
        method: 'PUT',
        body
      }),
      transformResponse: (response: { contraction: Contraction }) => response.contraction,
      invalidatesTags: (_result, _error, { monitoringId }) => [
        'Monitorings',
        'Practice',
        { type: 'Monitoring', id: monitoringId }
      ]
    }),
    removeContraction: build.mutation<void, { monitoringId: string; id: string }>({
      query: ({ monitoringId, id }) => ({ url: `/monitorings/${monitoringId}/contractions/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { monitoringId }) => [
        'Monitorings',
        'Practice',
        { type: 'Monitoring', id: monitoringId }
      ]
    }),
    recordMovement: build.mutation<Movement, { monitoringId: string; movement: Movement }>({
      query: ({ monitoringId, movement: { id, at } }) => ({
        url: `/monitorings/${monitoringId}/movements/${id}`,
        method: 'PUT',
        body: { at }
      }),
      transformResponse: (response: { movement: Movement }) => response.movement,
      invalidatesTags: (_result, _error, { monitoringId }) => ['Monitorings', { type: 'Monitoring', id: monitoringId }]
    }),
    removeMovement: build.mutation<void, { monitoringId: string; id: string }>({
      query: ({ monitoringId, id }) => ({ url: `/monitorings/${monitoringId}/movements/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { monitoringId }) => ['Monitorings', { type: 'Monitoring', id: monitoringId }]
    })
  })
});

export const {
  useListMonitoringsQuery,
  useGetMonitoringQuery,
  useStartMonitoringMutation,
  useStopMonitoringMutation,
  useDeleteMonitoringMutation,
  useSaveContractionMutation,
  useRemoveContractionMutation,
  useRecordMovementMutation,
  useRemoveMovementMutation
} = monitoringApi;
