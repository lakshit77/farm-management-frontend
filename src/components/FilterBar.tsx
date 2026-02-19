/**
 * Shared filter bar for the dashboard. Provides Horse and Class dropdown selects
 * populated from the currently loaded schedule data.
 */

import React from "react";
import { X, PawPrint, BookOpen, ChevronDown } from "lucide-react";

export interface DashboardFilters {
  /** Selected horse name or empty string for "all". */
  horseName: string;
  /** Selected class name or empty string for "all". */
  className: string;
}

interface FilterBarProps {
  /** All unique horse names from the current day's schedule. */
  horseOptions: string[];
  /** All unique class names from the current day's schedule. */
  classOptions: string[];
  /** Current filter values. */
  filters: DashboardFilters;
  /** Called when any filter changes. */
  onChange: (filters: DashboardFilters) => void;
}

/**
 * FilterBar renders Horse and Class dropdown selects with a clear-all button.
 * Receives options derived from loaded schedule data so no extra fetch is needed.
 */
export const FilterBar: React.FC<FilterBarProps> = ({
  horseOptions,
  classOptions,
  filters,
  onChange,
}) => {
  const hasActiveFilters = filters.horseName !== "" || filters.className !== "";

  const handleHorseChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    onChange({ ...filters, horseName: e.target.value });
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    onChange({ ...filters, className: e.target.value });
  };

  const clearAll = (): void => {
    onChange({ horseName: "", className: "" });
  };

  const selectClass =
    "h-9 w-36 font-body text-sm text-text-primary border border-border-card rounded-lg pl-8 pr-7 bg-background-primary focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-transparent appearance-none cursor-pointer truncate";

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Horse dropdown */}
      <div className="relative shrink-0">
        <PawPrint className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-text-secondary pointer-events-none" aria-hidden />
        <select
          aria-label="Filter by horse"
          value={filters.horseName}
          onChange={handleHorseChange}
          className={selectClass}
        >
          <option value="">All horses</option>
          {horseOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-text-secondary pointer-events-none" aria-hidden />
      </div>

      {/* Class dropdown */}
      <div className="relative shrink-0">
        <BookOpen className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-text-secondary pointer-events-none" aria-hidden />
        <select
          aria-label="Filter by class"
          value={filters.className}
          onChange={handleClassChange}
          className={selectClass}
        >
          <option value="">All classes</option>
          {classOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-text-secondary pointer-events-none" aria-hidden />
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="h-9 shrink-0 inline-flex items-center gap-1 px-2.5 font-body text-xs font-medium text-accent-green-dark hover:bg-accent-green/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green transition-colors"
        >
          <X className="size-3.5" aria-hidden />
          <span>Clear</span>
        </button>
      )}
    </div>
  );
};
