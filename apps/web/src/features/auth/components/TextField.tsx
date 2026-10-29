//~ A labelled input, big enough for a thumb.
import type { InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const TextField = ({ label, id, ...inputProps }: TextFieldProps) => {
  const inputId = id ?? inputProps.name;

  return (
    <div className="auth__field">
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} {...inputProps} />
    </div>
  );
};
