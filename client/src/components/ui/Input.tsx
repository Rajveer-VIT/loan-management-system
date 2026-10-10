import React, { forwardRef, useId } from 'react';

interface FieldShellProps {
  id: string;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactNode;
}

/** Label + control + helper/error text, wired together with htmlFor / aria-describedby. */
export const FieldShell: React.FC<FieldShellProps> = ({ id, label, error, helperText, required, children }) => (
  <div className="w-full">
    {label && (
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-600" aria-hidden="true">*</span>}
      </label>
    )}
    {children}
    {error ? (
      <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
        {error}
      </p>
    ) : (
      helperText && (
        <p id={`${id}-help`} className="mt-1.5 text-xs text-slate-500">
          {helperText}
        </p>
      )
    )}
  </div>
);

export const controlClass = (hasError: boolean) =>
  `block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 ${
    hasError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100'
  }`;

export function describedBy(id: string, error?: string, helperText?: string): string | undefined {
  if (error) return `${id}-error`;
  if (helperText) return `${id}-help`;
  return undefined;
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id: idProp, required, ...props }, ref) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    return (
      <FieldShell id={id} label={label} error={error} helperText={helperText} required={required}>
        <input
          ref={ref}
          id={id}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy(id, error, helperText)}
          className={`${controlClass(!!error)} ${className}`}
          {...props}
        />
      </FieldShell>
    );
  }
);

Input.displayName = 'Input';
