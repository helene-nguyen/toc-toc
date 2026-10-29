//~ Inline feedback under a form.
export const FormMessage = ({ children }: { children: string }) => (
  <p className="auth__error" role="alert">
    {children}
  </p>
);
