import React from "react";

export interface HeaderProps {
  breadcrumb: string;
  title: string;
  subtitle?: string;
  /** Optional icon element (e.g. from lucide-react) to show beside the title. */
  icon?: React.ReactNode;
}

/**
 * Page header with breadcrumb, main title (serif), and optional subtitle.
 * Matches design.json: small sans-serif breadcrumb in warm accent, large serif title in muted green.
 */
export const Header: React.FC<HeaderProps> = ({
  breadcrumb,
  title,
  subtitle,
  icon,
}) => {
  return (
    <header className="mb-8">
      <p
        className="font-body text-sm font-medium text-warm-orange-brown mb-2"
        aria-label="Section context"
      >
        {breadcrumb}
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        {icon && <span className="shrink-0" aria-hidden>{icon}</span>}
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-accent-green-dark">
          {title}
        </h1>
      </div>
      {subtitle && (
        <p className="font-body text-base text-text-secondary mt-2 leading-relaxed max-w-2xl">
          {subtitle}
        </p>
      )}
    </header>
  );
};
