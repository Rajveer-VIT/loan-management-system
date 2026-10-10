import React, { forwardRef, useId } from 'react';
import { FieldShell, controlClass, describedBy } from './Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className = '', id: idProp, required, ...props }, ref) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    return (
      <FieldShell id={id} label={label} error={error} helperText={helperText} required={required}>
        <select
          ref={ref}
          id={id}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy(id, error, helperText)}
          className={`${controlClass(!!error)} ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FieldShell>
    );
  }
);

Select.displayName = 'Select';
