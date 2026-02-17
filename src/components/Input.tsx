import React from "react";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> {
  label?: string;
  error?: string;
  className?: string;
}

/**
 * Text input with optional label and error. design system borders and typography.
 */
export const Input: React.FC<InputProps> = ({
  label,
  error,
  id,
  className = "",
  ...props
}) => {
  const inputId = id ?? `input-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={inputId}
          className="block font-body text-sm font-medium text-text-primary mb-1.5"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full font-body text-text-primary border border-border-card rounded-card px-4 py-2.5
          placeholder:text-text-secondary
          focus:outline-none focus:ring-2 focus:ring-accent-green focus:ring-offset-1
          disabled:bg-surface-card-alt disabled:cursor-not-allowed
        `}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <p
          id={`${inputId}-error`}
          className="font-body text-sm text-warm-rust mt-1.5"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};
