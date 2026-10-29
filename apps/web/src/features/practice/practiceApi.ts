//~ Practice contraction endpoints, injected into the base API slice. Saving
// and removing go through the outbox (useOutboxSync), like monitoring taps.
import { api } from '../../app/api';
import type { PracticeContraction, PracticeEntry } from './practiceTypes';

export const practiceApi = api.injectEndpoints({
  endpoints: (build) => ({
    listPractice: build.query<PracticeEntry[], void>({
      query: () => '/practice-contractions',
      transformResponse: (response: { contractions: PracticeEntry[] }) => response.contractions,
      providesTags: ['Practice']
    }),
    savePractice: build.mutation<PracticeContraction, PracticeContraction>({
      query: ({ id, ...body }) => ({ url: `/practice-contractions/${id}`, method: 'PUT', body }),
      transformResponse: (response: { contraction: PracticeContraction }) => response.contraction,
      invalidatesTags: ['Practice']
    }),
    removePractice: build.mutation<void, { id: string }>({
      query: ({ id }) => ({ url: `/practice-contractions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Practice']
    })
  })
});

export const { useListPracticeQuery } = practiceApi;
