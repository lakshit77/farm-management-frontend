import React from "react";

export interface FooterCardProps {
  icon: React.ReactNode;
  title: string;
  body: string;
}

/**
 * Full-width or side-by-side dark green card with white text. design.json: footerCard.
 */
export const FooterCard: React.FC<FooterCardProps> = ({
  icon,
  title,
  body,
}) => {
  return (
    <article
      className="bg-accent-green rounded-card p-card-padding text-text-on-dark flex gap-4"
      aria-labelledby={`footer-title-${title.replace(/\s/g, "-")}`}
    >
      <div
        className="flex-shrink-0 w-12 h-12 rounded-icon bg-white/20 flex items-center justify-center text-white"
        aria-hidden
      >
        {icon}
      </div>
      <div>
        <h3
          id={`footer-title-${title.replace(/\s/g, "-")}`}
          className="font-body font-bold text-lg mb-1"
        >
          {title}
        </h3>
        <p className="font-body text-sm opacity-90 leading-relaxed">
          {body}
        </p>
      </div>
    </article>
  );
};
