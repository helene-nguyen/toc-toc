//~ The frame around every signed-in page: the brand and the account on
// top, the page, and the bottom bar within thumb reach — the app is used
// one-handed on a phone. The outbox syncs from here, and the running
// monitoring is matched with the server's, whatever page is open.
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { api } from '../app/api';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { useMeQuery, useSignOutMutation } from '../features/auth/authApi';
import { signedOut } from '../features/monitoring/monitoringSlice';
import { useOutboxSync } from '../features/monitoring/hooks/useOutboxSync';
import { useRunningMonitoringSync } from '../features/monitoring/hooks/useRunningMonitoringSync';
import './appShell.css';

export const AppShell = () => {
  useOutboxSync();
  useRunningMonitoringSync();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { data: user } = useMeQuery();
  const pending = useAppSelector((state) => state.monitoring.outbox.length);
  const [signOut, { isLoading: signingOut }] = useSignOutMutation();
  const [confirm, setConfirm] = useState(false);

  const leave = async () => {
    try {
      await signOut().unwrap();
    } catch {
      // offline: the cookies stay, but this phone forgets the account anyway
    }
    dispatch(signedOut());
    dispatch(api.util.resetApiState());
    navigate('/signin', { replace: true });
  };

  return (
    <div className="shell">
      <header className="shell__top">
        <h1 className="shell__brand">
          <img className="shell__logo" src="/logo.png" alt="" width="36" height="36" />
          Toc-Toc
        </h1>
        {user && (
          <div className="shell__account">
            <span className="shell__email" title={user.email}>
              {user.name ?? user.email}
            </span>
            {confirm ? (
              <span className="shell__confirm">
                {pending > 0
                  ? `${pending} saisie${pending > 1 ? 's' : ''} pas encore envoyée${pending > 1 ? 's' : ''} sera perdue${pending > 1 ? 's' : ''}.`
                  : 'Se déconnecter ?'}
                <button type="button" className="shell__danger" disabled={signingOut} onClick={leave}>
                  Oui
                </button>
                <button type="button" className="shell__ghost" onClick={() => setConfirm(false)}>
                  Non
                </button>
              </span>
            ) : (
              <button type="button" className="shell__ghost" onClick={() => setConfirm(true)}>
                Se déconnecter
              </button>
            )}
          </div>
        )}
      </header>
      <main className="shell__main">
        <Outlet />
      </main>
      <nav className="shell__nav" aria-label="Navigation">
        <NavLink to="/" end>
          Monitoring
        </NavLink>
        <NavLink to="/preparation">Préparation</NavLink>
        <NavLink to="/sessions">Mes sessions</NavLink>
      </nav>
    </div>
  );
};
