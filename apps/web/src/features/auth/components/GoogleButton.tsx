//~ "Continue with Google", shown only when the server has Google set up.
// A plain link on purpose: OAuth is a full-page redirect dance with Google,
// not a fetch — the API route sends the browser there.
import { useProvidersQuery } from '../authApi';

export const GoogleButton = () => {
  const { data } = useProvidersQuery();
  if (!data?.google) return null;

  return (
    <div className="auth__alt">
      <span className="auth__or">ou</span>
      <a className="auth__google" href="/api/v1/auth/google">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M21.35 11.1H12v2.9h5.35c-.25 1.4-1.6 4.1-5.35 4.1-3.2 0-5.85-2.65-5.85-5.95S8.8 6.2 12 6.2c1.85 0 3.05.78 3.75 1.45l2.55-2.45C16.7 3.7 14.55 2.7 12 2.7 6.9 2.7 2.8 6.8 2.8 11.9S6.9 21.1 12 21.1c5.3 0 8.8-3.7 8.8-8.95 0-.6-.07-1.05-.15-1.5Z" />
        </svg>
        Continuer avec Google
      </a>
    </div>
  );
};
