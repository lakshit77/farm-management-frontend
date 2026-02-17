import React from "react";

export type ButtonVariant = "primary" | "secondary" | "outline";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

/**
 * Primary and secondary buttons using design system colors.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  children,
  className = "",
  disabled,
  ...props
}) => {
  const base =
    "font-body font-semibold text-sm px-5 py-2.5 rounded-card transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-accent-green text-text-on-dark hover:bg-accent-green-alt focus:ring-accent-green",
    secondary:
      "bg-warm-orange-brown text-white hover:bg-warm-orange-brown-alt focus:ring-warm-rust",
    outline:
      "border-2 border-accent-green text-accent-green-dark hover:bg-accent-green hover:text-text-on-dark focus:ring-accent-green",
  };
  return (
    <button
      type="button"
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
