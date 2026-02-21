/**
 * Shared filter bar for the dashboard. Provides Horse, Class, and Status
 * searchable dropdowns populated from the currently loaded schedule data.
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
} from "react";
import { createPortal } from "react-dom";
import {
  X,
  PawPrint,
  BookOpen,
  ChevronDown,
  Activity,
  Search,
  Check,
} from "lucide-react";
import type { StatusFilterValue } from "../utils/entryStatus";

export interface DashboardFilters {
  /** Selected horse name or empty string for "all". */
  horseName: string;
  /** Selected class name or empty string for "all". */
  className: string;
  /** Entry/class status filter: "" = all, "upcoming" = not started, "active" = underway, "completed" = completed. */
  statusFilter: StatusFilterValue;
}

// ---------------------------------------------------------------------------
// SearchableSelect
// ---------------------------------------------------------------------------

interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  /** Options to display (not including the "all" option). */
  options: SearchableSelectOption[];
  /** Currently selected value ("" = all). */
  value: string;
  /** Placeholder shown when nothing is selected. */
  placeholder: string;
  /** Accessible label for the control. */
  ariaLabel: string;
  /** Icon shown on the left of the trigger button. */
  icon: React.ReactNode;
  /** Called when the user picks a value ("" = clear selection). */
  onChange: (value: string) => void;
}

/**
 * Custom searchable dropdown that replaces a plain `<select>` element.
 * The floating panel is rendered via a React portal at the document body so
 * it is never clipped by ancestor overflow containers (e.g. overflow-x-auto
 * on the sticky toolbar).  The panel is positioned via getBoundingClientRect
 * and keeps itself in-viewport on scroll/resize.
 */
const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  placeholder,
  ariaLabel,
  icon,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  /** Position of the floating panel (viewport-relative). */
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  /** Filtered options based on the current search query. */
  const filtered = query.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.trim().toLowerCase())
      )
    : options;

  const selectedLabel = options.find((o) => o.value === value)?.label ?? null;

  /**
   * Compute the panel's fixed position from the trigger's bounding rect so
   * the panel always appears flush below the trigger button, regardless of
   * any scroll or overflow containers.
   */
  const updatePanelPosition = useCallback((): void => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const PANEL_WIDTH = 256; // w-64 = 16rem = 256px
    const actualWidth = Math.max(rect.width, PANEL_WIDTH);
    // Prevent panel from going off the right edge of the viewport
    const leftClamped = Math.min(
      rect.left,
      window.innerWidth - actualWidth - 8
    );
    setPanelStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: leftClamped,
      width: actualWidth,
      zIndex: 9999,
    });
  }, []);

  /** Recalculate position on scroll or resize while open. */
  useEffect(() => {
    if (!open) return;
    updatePanelPosition();
    window.addEventListener("scroll", updatePanelPosition, true);
    window.addEventListener("resize", updatePanelPosition);
    return () => {
      window.removeEventListener("scroll", updatePanelPosition, true);
      window.removeEventListener("resize", updatePanelPosition);
    };
  }, [open, updatePanelPosition]);

  /** Close panel on outside click (checks both trigger and floating panel). */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent): void => {
      const target = e.target as Node;
      const inTrigger = containerRef.current?.contains(target);
      const inPanel = document
        .getElementById(`${id}-panel`)
        ?.contains(target);
      if (!inTrigger && !inPanel) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, id]);

  /** Focus search input when panel opens. */
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  const toggle = useCallback(() => {
    setOpen((v) => {
      if (!v) updatePanelPosition();
      else setQuery("");
      return !v;
    });
  }, [updatePanelPosition]);

  const select = useCallback(
    (v: string) => {
      onChange(v);
      setOpen(false);
      setQuery("");
    },
    [onChange]
  );

  const handleTriggerKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    } else if ((e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") && !open) {
      e.preventDefault();
      updatePanelPosition();
      setOpen(true);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    } else if (e.key === "ArrowDown") {
      const first = listRef.current?.querySelector<HTMLElement>("[role='option']");
      first?.focus();
    } else if (e.key === "Enter" && filtered.length === 1) {
      select(filtered[0]!.value);
    }
  };

  const handleOptionKeyDown = (
    e: React.KeyboardEvent<HTMLLIElement>,
    v: string
  ): void => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select(v);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    } else if (e.key === "ArrowDown") {
      (e.currentTarget.nextElementSibling as HTMLElement | null)?.focus();
    } else if (e.key === "ArrowUp") {
      const prev = e.currentTarget.previousElementSibling as HTMLElement | null;
      if (prev) prev.focus();
      else searchRef.current?.focus();
    }
  };

  const isActive = value !== "";

  /** The floating panel — rendered into document.body via portal. */
  const panel = open
    ? createPortal(
        <div
          id={`${id}-panel`}
          style={panelStyle}
          className="bg-surface-card border border-border-card rounded-card shadow-card overflow-hidden"
        >
          {/* Search input */}
          <div className="px-2 pt-2 pb-1.5 border-b border-border-card">
            <div className="relative">
              <Search
                className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-text-secondary pointer-events-none"
                aria-hidden
              />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search…"
                className="w-full h-8 pl-7 pr-6 font-body text-sm bg-background-primary border border-border-card rounded-md focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-transparent placeholder:text-text-secondary/60"
                aria-label={`Search ${ariaLabel}`}
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-text-secondary hover:text-text-primary focus:outline-none"
                  aria-label="Clear search"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Option list */}
          <ul
            ref={listRef}
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-52 overflow-y-auto py-1 overscroll-contain"
          >
            {/* "All" option — hidden while searching */}
            {!query && (
              <li
                role="option"
                aria-selected={value === ""}
                tabIndex={0}
                onClick={() => select("")}
                onKeyDown={(e) => handleOptionKeyDown(e, "")}
                className={`px-3 py-2 font-body text-sm cursor-pointer flex items-center gap-2
                  hover:bg-accent-green/10 focus:bg-accent-green/10 focus:outline-none
                  ${value === "" ? "text-accent-green-dark font-medium" : "text-text-secondary"}`}
              >
                <span className="w-4 flex items-center justify-center shrink-0">
                  {value === "" && <Check className="size-3.5" />}
                </span>
                <span className="italic">{placeholder}</span>
              </li>
            )}

            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center font-body text-sm text-text-secondary select-none">
                No matches for &ldquo;{query}&rdquo;
              </li>
            )}

            {filtered.map((opt) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                tabIndex={0}
                onClick={() => select(opt.value)}
                onKeyDown={(e) => handleOptionKeyDown(e, opt.value)}
                className={`px-3 py-2 font-body text-sm cursor-pointer flex items-center gap-2
                  hover:bg-accent-green/10 focus:bg-accent-green/10 focus:outline-none
                  ${opt.value === value
                    ? "text-accent-green-dark font-medium bg-accent-green/5"
                    : "text-text-primary"}`}
              >
                <span className="w-4 flex items-center justify-center shrink-0">
                  {opt.value === value && (
                    <Check className="size-3.5 text-accent-green-dark" />
                  )}
                </span>
                <span className="truncate">{opt.label}</span>
              </li>
            ))}
          </ul>

          {/* Count hint */}
          {options.length > 0 && (
            <div className="px-3 py-1.5 border-t border-border-card bg-background-primary/60">
              <p className="font-body text-[11px] text-text-secondary">
                {query
                  ? `${filtered.length} of ${options.length}`
                  : `${options.length}`}{" "}
                option{options.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <div
      ref={containerRef}
      className="relative flex-1 sm:flex-initial min-w-0 sm:shrink-0"
    >
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        id={`${id}-btn`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={toggle}
        onKeyDown={handleTriggerKeyDown}
        className={`
          h-10 sm:h-9 w-full sm:w-40 min-w-0 font-body text-sm border rounded-lg
          pl-8 pr-7 bg-background-primary focus:outline-none focus:ring-2
          focus:ring-accent-green focus:border-transparent text-left truncate
          touch-manipulation flex items-center transition-colors
          ${isActive
            ? "border-accent-green text-accent-green-dark font-medium"
            : "border-border-card text-text-primary"
          }
        `}
      >
        <span className="truncate">{selectedLabel ?? placeholder}</span>
      </button>

      {/* Left icon */}
      <span
        className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-text-secondary pointer-events-none"
        aria-hidden
      >
        {icon}
      </span>
      {/* Chevron */}
      <ChevronDown
        className={`absolute right-2 top-1/2 -translate-y-1/2 size-3.5 pointer-events-none transition-transform ${
          open ? "rotate-180 text-accent-green-dark" : "text-text-secondary"
        }`}
        aria-hidden
      />

      {panel}
    </div>
  );
};

// ---------------------------------------------------------------------------
// FilterBar
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: SearchableSelectOption[] = [
  { value: "upcoming", label: "Not started" },
  { value: "active", label: "Underway" },
  { value: "completed", label: "Completed" },
];

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
 * FilterBar renders searchable Horse, Class, and Status dropdowns.
 * Each dropdown has a live search input so users can quickly find options
 * even when there are 50+ horses or classes.
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

  const clearAll = (): void => {
    onChange({ horseName: "", className: "", statusFilter: "" });
  };

  const horseSelectOptions: SearchableSelectOption[] = horseOptions.map(
    (name) => ({ value: name, label: name })
  );

  const classSelectOptions: SearchableSelectOption[] = classOptions.map(
    (name) => ({ value: name, label: name })
  );

  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto sm:shrink-0">
      {/* Horse searchable dropdown */}
      <SearchableSelect
        options={horseSelectOptions}
        value={filters.horseName}
        placeholder="All horses"
        ariaLabel="Filter by horse"
        icon={<PawPrint className="size-3.5" />}
        onChange={(v) => onChange({ ...filters, horseName: v })}
      />

      {/* Class searchable dropdown */}
      <SearchableSelect
        options={classSelectOptions}
        value={filters.className}
        placeholder="All classes"
        ariaLabel="Filter by class"
        icon={<BookOpen className="size-3.5" />}
        onChange={(v) => onChange({ ...filters, className: v })}
      />

      {/* Status searchable dropdown */}
      <SearchableSelect
        options={STATUS_OPTIONS}
        value={filters.statusFilter}
        placeholder="All statuses"
        ariaLabel="Filter by status"
        icon={<Activity className="size-3.5" />}
        onChange={(v) => onChange({ ...filters, statusFilter: v as StatusFilterValue })}
      />

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
