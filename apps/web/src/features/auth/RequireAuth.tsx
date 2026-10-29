//~ Route guard: children render only with a live session.
// The `me` query is the single source of truth — a 401 that the refresh
// can't fix sends the visitor to the sign-in page. It also tells the
// monitoring slice whose phone data it holds.
import { useEffect, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAppDispatch } from '../../app/hooks';
import { accountChanged } from '../monitoring/monitoringSlice';
import { useMeQuery } from './authApi';

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch();
  const { data: user, isLoading, isError, error } = useMeQuery();

  useEffect(() => {
    if (user) dispatch(accountChanged(user.id));
  }, [user, dispatch]);

  if (isLoading) return null;

  // offline with a session already open: keep the app usable, the outbox waits
  const offline = isError && typeof (error as { status?: unknown }).status !== 'number';
  if (isError && !offline) return <Navigate to="/signin" replace />;

  return children;
};
