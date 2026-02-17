import React from "react";

export interface CapabilityItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export interface CoreCapabilitiesCardProps {
  title: string;
  items: CapabilityItem[];
}

/**
 * Tall card listing capabilities with green circle icons. design.json: coreCapabilitiesCard.
 */
export const CoreCapabilitiesCard: React.FC<CoreCapabilitiesCardProps> = ({
  title,
  items,
}) => {
  return (
    <section
      className="bg-surface-card rounded-card p-card-padding shadow-card h-full flex flex-col"
      aria-labelledby="core-capabilities-title"
    >
      <h2
        id="core-capabilities-title"
        className="font-body font-bold text-xl text-text-primary mb-6"
      >
        {title}
      </h2>
      <ul className="space-y-5 flex-1" role="list">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-icon bg-accent-green flex items-center justify-center text-text-on-dark"
              aria-hidden
            >
              {item.icon}
            </div>
            <div>
              <h4 className="font-body font-bold text-text-primary mb-0.5">
                {item.title}
              </h4>
              <p className="font-body text-text-secondary text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
