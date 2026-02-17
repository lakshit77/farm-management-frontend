import React from "react";

export type BadgeVariant = "default" | "warm" | "green";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

/**
 * Small label/tag using design system colors.
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  className = "",
}) => {
  const variants: Record<BadgeVariant, string> = {
    default:
      "bg-border-card text-text-secondary",
    warm:
      "bg-warm-orange-brown/15 text-warm-rust",
    green:
      "bg-accent-green/15 text-accent-green-dark",
  };
  return (
    <span
      className={`inline-flex font-body text-xs font-medium px-2.5 py-1 rounded-md ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
