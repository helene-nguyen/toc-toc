//~ Create an account — signed in straight away.
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useSignUpMutation } from '../authApi';
import { apiErrorMessage } from '../apiError';
import { AuthCard } from '../components/AuthCard';
import { TextField } from '../components/TextField';
import { FormMessage } from '../components/FormMessage';
import { GoogleButton } from '../components/GoogleButton';

export const SignUpPage = () => {
  const [signUp, { isLoading }] = useSignUpMutation();
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      await signUp({
        email: String(form.get('email')),
        password: String(form.get('password')),
        passwordConfirmation: String(form.get('passwordConfirmation'))
      }).unwrap();
      navigate('/', { replace: true });
    } catch (caught) {
      setError(apiErrorMessage(caught));
    }
  };

  return (
    <AuthCard title="Créer un compte">
      <form className="auth__form" onSubmit={onSubmit}>
        <TextField label="Email" name="email" type="email" autoComplete="email" required />
        <TextField
          label="Mot de passe (8 caractères minimum)"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <TextField
          label="Confirmer le mot de passe"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        {error && <FormMessage>{error}</FormMessage>}
        <button className="auth__submit" type="submit" disabled={isLoading}>
          Créer mon compte
        </button>
      </form>
      <GoogleButton />
      <p className="auth__switch">
        Déjà un compte ? <Link to="/signin">Se connecter</Link>
      </p>
    </AuthCard>
  );
};
