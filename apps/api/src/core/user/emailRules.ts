//~ The rules every email goes through, whatever the way in (form or Google):
// compared without case or stray spaces, and — when the app is shared with a
// chosen few — only the emails on the list may open an account.

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

// null: anyone may sign up
export type EmailAllowlist = ReadonlySet<string> | null;

export const isAllowed = (email: string, allowlist: EmailAllowlist): boolean =>
  allowlist === null || allowlist.has(normalizeEmail(email));
