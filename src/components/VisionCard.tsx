import React from "react";

export interface VisionCardProps {
  icon: React.ReactNode;
  title: string;
  body: string;
}

/**
 * Smaller card with accent (orange-brown) icon, no left border. design.json: visionCard.
 */
export const VisionCard: React.FC<VisionCardProps> = ({
  icon,
  title,
  body,
}) => {
  return (
    <article
      className="bg-surface-card rounded-card p-card-padding shadow-card"
      aria-labelledby={`vision-title-${title.replace(/\s/g, "-")}`}
    >
      <div
        className="flex items-center gap-2 mb-3 text-warm-rust"
        aria-hidden
      >
        {icon}
      </div>
      <h3
        id={`vision-title-${title.replace(/\s/g, "-")}`}
        className="font-body font-bold text-lg text-text-primary mb-2"
      >
        {title}
      </h3>
      <p className="font-body text-text-primary text-base leading-relaxed">
        {body}
      </p>
    </article>
  );
};
