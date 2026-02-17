import React from "react";

export interface InformationCardProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  showLeftBorder?: boolean;
}

/**
 * Rectangular card with rounded corners, optional left border, green circle icon, title and body.
 * design.json: informationCard.
 */
export const InformationCard: React.FC<InformationCardProps> = ({
  icon,
  title,
  body,
  showLeftBorder = true,
}) => {
  return (
    <article
      className={`
        bg-surface-card rounded-card p-card-padding shadow-card
        flex gap-4
        ${showLeftBorder ? "border-l-4 border-border-card-accent pl-5" : ""}
      `}
      aria-labelledby={`info-title-${title.replace(/\s/g, "-")}`}
    >
      <div
        className="flex-shrink-0 w-12 h-12 rounded-icon bg-accent-green flex items-center justify-center text-text-on-dark"
        aria-hidden
      >
        {icon}
      </div>
      <div>
        <h3
          id={`info-title-${title.replace(/\s/g, "-")}`}
          className="font-body font-bold text-lg text-text-primary mb-2"
        >
          {title}
        </h3>
        <p className="font-body text-text-primary text-base leading-relaxed">
          {body}
        </p>
      </div>
    </article>
  );
};
