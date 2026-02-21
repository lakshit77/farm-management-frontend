/**
 * Shared filter bar for the dashboard. Provides Horse, Class, and Status dropdown selects
 * populated from the currently loaded schedule data.
 */

import React from "react";
import { X, PawPrint, BookOpen, ChevronDown, Activity } from "lucide-react";
import type { StatusFilterValue } from "../utils/entryStatus";

export interface DashboardFilters {
  /** Selected horse name or empty string for "all". */
  horseName: string;
  /** Selected class name or empty string for "all". */
  className: string;
  /** Entry/class status filter: "" = all, "upcoming" = not started, "active" = underway, "completed" = completed. */
  statusFilter: StatusFilterValue;
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
  const hasActiveFilters =
    filters.horseName !== "" ||
    filters.className !== "" ||
    filters.statusFilter !== "";

  const handleHorseChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    onChange({ ...filters, horseName: e.target.value });
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    onChange({ ...filters, className: e.target.value });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    onChange({
      ...filters,
      statusFilter: e.target.value as StatusFilterValue,
    });
  };

  const clearAll = (): void => {
    onChange({ horseName: "", className: "", statusFilter: "" });
  };

  const selectClass =
    "h-10 sm:h-9 w-full sm:w-36 min-w-0 font-body text-sm text-text-primary border border-border-card rounded-lg pl-8 pr-7 bg-background-primary focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-transparent appearance-none cursor-pointer truncate touch-manipulation";

  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto sm:shrink-0">
      {/* Horse dropdown */}
      <div className="relative flex-1 sm:flex-initial min-w-0 sm:shrink-0">
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
      <div className="relative flex-1 sm:flex-initial min-w-0 sm:shrink-0">
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

      {/* Status dropdown */}
      <div className="relative flex-1 sm:flex-initial min-w-0 sm:shrink-0">
        <Activity className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-text-secondary pointer-events-none" aria-hidden />
        <select
          aria-label="Filter by status"
          value={filters.statusFilter}
          onChange={handleStatusChange}
          className={selectClass}
        >
          <option value="">All statuses</option>
          <option value="upcoming">Not started</option>
          <option value="active">Underway</option>
          <option value="completed">Completed</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-text-secondary pointer-events-none" aria-hidden />
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="h-10 sm:h-9 shrink-0 inline-flex items-center gap-1 px-2.5 font-body text-xs font-medium text-accent-green-dark hover:bg-accent-green/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green transition-colors touch-manipulation min-h-[44px] sm:min-h-0"
        >
          <X className="size-3.5" aria-hidden />
          <span>Clear</span>
        </button>
      )}
    </div>
  );
};
