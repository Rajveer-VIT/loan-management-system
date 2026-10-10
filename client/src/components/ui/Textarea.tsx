import React, { forwardRef, useId } from 'react';
import { FieldShell, controlClass, describedBy } from './Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', id: idProp, required, ...props }, ref) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    return (
      <FieldShell id={id} label={label} error={error} helperText={helperText} required={required}>
        <textarea
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

Textarea.displayName = 'Textarea';
