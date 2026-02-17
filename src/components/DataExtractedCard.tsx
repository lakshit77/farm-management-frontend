import React from "react";

export interface DataItem {
  icon: React.ReactNode;
  label: string;
}

export interface DataExtractedCardProps {
  title: string;
  items: DataItem[];
}

/**
 * Card listing data items with warm brown/gold circle icons. design.json: dataExtractedCard.
 */
export const DataExtractedCard: React.FC<DataExtractedCardProps> = ({
  title,
  items,
}) => {
  return (
    <section
      className="bg-surface-card rounded-card p-card-padding shadow-card"
      aria-labelledby="data-extracted-title"
    >
      <h2
        id="data-extracted-title"
        className="font-body font-bold text-xl text-text-primary mb-4"
      >
        {title}
      </h2>
      <ul className="space-y-3" role="list">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-3">
            <span
              className="flex-shrink-0 w-9 h-9 rounded-icon bg-icon-gold flex items-center justify-center text-text-on-dark"
              aria-hidden
            >
              {item.icon}
            </span>
            <span className="font-body text-text-primary text-sm">
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};
