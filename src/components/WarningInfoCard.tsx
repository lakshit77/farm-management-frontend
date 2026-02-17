import React from "react";

export interface WarningInfoCardProps {
  icon: React.ReactNode;
  title: string;
  message: string;
}

/**
 * Info/warning card with soft warm brown background. design.json: warningInfoCard.
 */
export const WarningInfoCard: React.FC<WarningInfoCardProps> = ({
  icon,
  title,
  message,
}) => {
  return (
    <aside
      className="bg-semantic-warning-bg rounded-card p-card-padding border border-warm-orange-brown/30"
      role="note"
      aria-labelledby="warning-card-title"
    >
      <div className="flex gap-3">
        <div
          className="flex-shrink-0 text-warm-rust mt-0.5"
          aria-hidden
        >
          {icon}
        </div>
        <div>
          <h3
            id="warning-card-title"
            className="font-body font-bold text-text-primary-alt mb-1"
          >
            {title}
          </h3>
          <p className="font-body text-text-secondary text-sm leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    </aside>
  );
};
