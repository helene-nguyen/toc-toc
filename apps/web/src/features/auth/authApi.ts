//~ Auth endpoints, injected into the base API slice.
import { api } from '../../app/api';

export interface User {
  id: number;
  email: string;
  // from Google; email/password accounts have none
  name: string | null;
}

export interface SignUpBody {
  email: string;
  password: string;
  passwordConfirmation: string;
}

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    me: build.query<User, void>({
      query: () => '/me',
      transformResponse: (response: { user: User }) => response.user,
      providesTags: ['Session']
    }),
    // which ways in the server offers (Google only once it is configured)
    providers: build.query<{ google: boolean }, void>({
      query: () => '/auth/providers'
    }),
    signUp: build.mutation<{ user: User }, SignUpBody>({
      query: (body) => ({ url: '/signup', method: 'POST', body }),
      invalidatesTags: ['Session']
    }),
    signIn: build.mutation<{ user: User }, { email: string; password: string }>({
      query: (body) => ({ url: '/signin', method: 'POST', body }),
      invalidatesTags: ['Session']
    }),
    signOut: build.mutation<void, void>({
      query: () => ({ url: '/signout', method: 'POST' })
    })
  })
});

export const { useMeQuery, useProvidersQuery, useSignUpMutation, useSignInMutation, useSignOutMutation } = authApi;
