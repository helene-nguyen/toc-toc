//~ Translate the API's error names into sentences for the form messages.
const messages: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect.',
  EMAIL_ALREADY_USED: 'Un compte existe déjà avec cet email : connectez-vous.',
  PASSWORDS_DO_NOT_MATCH: 'Les deux mots de passe ne sont pas identiques.',
  EMAIL_NOT_ALLOWED: "Cet email n'est pas autorisé à créer un compte sur cette application."
};

export const apiErrorMessage = (error: unknown): string => {
  const status = (error as { status?: number | string } | null)?.status;
  if (typeof status !== 'number') return 'Serveur injoignable : vérifiez votre connexion et réessayez.';

  const name = (error as { data?: { error?: string } }).data?.error;
  if (name && messages[name]) return messages[name];
  if (status === 400) return 'Vérifiez les champs du formulaire.';
  return 'Une erreur est survenue, réessayez.';
};

//~ Why the Google round trip came back to /signin (?error=…)
export const googleErrorMessage = (code: string | null): string | null =>
  code === 'not-allowed'
    ? "Ce compte Google n'est pas autorisé à utiliser cette application."
    : code === 'google'
      ? "La connexion avec Google n'a pas abouti, réessayez."
      : null;
