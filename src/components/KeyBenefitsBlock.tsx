import React from "react";
import { IconCheck } from "./icons";

export interface KeyBenefitsBlockProps {
  title: string;
  items: string[];
}

/**
 * Large block with dark olive background, white text, orange-brown checkmark icons.
 * design.json: keyBenefitsBlock.
 */
export const KeyBenefitsBlock: React.FC<KeyBenefitsBlockProps> = ({
  title,
  items,
}) => {
  return (
    <section
      className="bg-accent-green rounded-card-lg p-card-padding text-text-on-dark"
      aria-labelledby="key-benefits-title"
    >
      <h2
        id="key-benefits-title"
        className="font-body font-bold text-xl mb-6"
      >
        {title}
      </h2>
      <ul className="space-y-4" role="list">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-3">
            <span
              className="flex-shrink-0 w-8 h-8 rounded-icon bg-warm-orange-brown-alt flex items-center justify-center"
              aria-hidden
            >
              <IconCheck className="w-4 h-4 text-white" />
            </span>
            <span className="font-body text-base">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};
