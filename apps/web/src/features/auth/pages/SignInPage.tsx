//~ Sign in with an email and a password, or with Google.
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useSignInMutation } from '../authApi';
import { apiErrorMessage, googleErrorMessage } from '../apiError';
import { AuthCard } from '../components/AuthCard';
import { TextField } from '../components/TextField';
import { FormMessage } from '../components/FormMessage';
import { GoogleButton } from '../components/GoogleButton';

export const SignInPage = () => {
  const [signIn, { isLoading }] = useSignInMutation();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(() => googleErrorMessage(params.get('error')));
  const navigate = useNavigate();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      await signIn({ email: String(form.get('email')), password: String(form.get('password')) }).unwrap();
      navigate('/', { replace: true });
    } catch (caught) {
      setError(apiErrorMessage(caught));
    }
  };

  return (
    <AuthCard title="Connexion">
      <form className="auth__form" onSubmit={onSubmit}>
        <TextField label="Email" name="email" type="email" autoComplete="email" required />
        <TextField label="Mot de passe" name="password" type="password" autoComplete="current-password" required />
        {error && <FormMessage>{error}</FormMessage>}
        <button className="auth__submit" type="submit" disabled={isLoading}>
          Se connecter
        </button>
      </form>
      <GoogleButton />
      <p className="auth__switch">
        Pas encore de compte ? <Link to="/signup">Créer un compte</Link>
      </p>
    </AuthCard>
  );
};
