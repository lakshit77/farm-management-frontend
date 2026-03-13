import React, { useState, useEffect, useCallback } from "react";
import { X, PawPrint, BookOpen, Activity, Check } from "lucide-react";
import type { DashboardFilters } from "../FilterBar";
import type { StatusFilterValue } from "../../utils/entryStatus";

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  horseOptions: string[];
  classOptions: string[];
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
}

const STATUS_OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "upcoming", label: "Not started" },
  { value: "active", label: "Underway" },
  { value: "completed", label: "Completed" },
];

function FilterSelect({
  label,
  icon,
  value,
  options,
  placeholder,
  onChange,
  searchable,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  onChange: (v: string) => void;
  searchable?: boolean;
}): React.ReactElement {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filtered = query.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.trim().toLowerCase())
      )
    : options;

  const selectedLabel = options.find((o) => o.value === value)?.label ?? null;

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary uppercase tracking-wide">
        {icon}
        {label}
      </label>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`w-full h-11 px-3 rounded-lg border text-left font-body text-sm transition-colors touch-manipulation flex items-center justify-between ${
          value
            ? "border-accent-green text-accent-green-dark font-medium"
            : "border-border-card text-text-primary"
        }`}
      >
        <span className="truncate">{selectedLabel ?? placeholder}</span>
        <span className={`text-text-secondary transition-transform ${expanded ? "rotate-180" : ""}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </button>

      {expanded && (
        <div className="rounded-lg border border-border-card bg-background-primary overflow-hidden">
          {searchable && options.length > 5 && (
            <div className="px-2 py-1.5 border-b border-border-card">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full h-8 px-2 font-body text-sm bg-surface-card border border-border-card rounded-md focus:outline-none focus:ring-2 focus:ring-accent-green"
                autoComplete="off"
              />
            </div>
          )}
          <ul className="max-h-44 overflow-y-auto overscroll-contain py-1">
            <li>
              <button
                type="button"
                onClick={() => { onChange(""); setExpanded(false); setQuery(""); }}
                className={`w-full px-3 py-2.5 text-left font-body text-sm flex items-center gap-2 active:bg-accent-green/10 touch-manipulation ${
                  !value ? "text-accent-green-dark font-medium" : "text-text-secondary"
                }`}
              >
                <span className="w-4 flex items-center justify-center shrink-0">
                  {!value && <Check className="size-3.5" />}
                </span>
                <span className="italic">{placeholder}</span>
              </button>
            </li>
            {filtered.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => { onChange(opt.value); setExpanded(false); setQuery(""); }}
                  className={`w-full px-3 py-2.5 text-left font-body text-sm flex items-center gap-2 active:bg-accent-green/10 touch-manipulation ${
                    opt.value === value
                      ? "text-accent-green-dark font-medium bg-accent-green/5"
                      : "text-text-primary"
                  }`}
                >
                  <span className="w-4 flex items-center justify-center shrink-0">
                    {opt.value === value && <Check className="size-3.5 text-accent-green-dark" />}
                  </span>
                  <span className="truncate">{opt.label}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center font-body text-sm text-text-secondary">
                No matches
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export const FilterSheet: React.FC<FilterSheetProps> = ({
  open,
  onClose,
  horseOptions,
  classOptions,
  filters,
  onChange,
}) => {
  const [local, setLocal] = useState<DashboardFilters>(filters);

  useEffect(() => {
    if (open) setLocal(filters);
  }, [open, filters]);

  const apply = useCallback(() => {
    onChange(local);
    onClose();
  }, [local, onChange, onClose]);

  const clearAll = useCallback(() => {
    const cleared: DashboardFilters = { horseName: "", className: "", statusFilter: "" };
    setLocal(cleared);
    onChange(cleared);
    onClose();
  }, [onChange, onClose]);

  const hasActiveFilters =
    local.horseName !== "" || local.className !== "" || local.statusFilter !== "";

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40 filter-sheet-backdrop"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[61] bg-surface-card rounded-t-2xl shadow-lg filter-sheet-enter safe-area-bottom">
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-border-card rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-border-card">
          <h2 className="font-heading text-base font-semibold text-text-primary">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary active:bg-background-primary touch-manipulation"
            aria-label="Close filters"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* Filter controls */}
        <div className="px-4 py-4 space-y-4 max-h-[60vh] overflow-y-auto overscroll-contain">
          <FilterSelect
            label="Horse"
            icon={<PawPrint className="size-3.5" />}
            value={local.horseName}
            options={horseOptions.map((n) => ({ value: n, label: n }))}
            placeholder="All horses"
            onChange={(v) => setLocal((f) => ({ ...f, horseName: v }))}
            searchable
          />

          <FilterSelect
            label="Class"
            icon={<BookOpen className="size-3.5" />}
            value={local.className}
            options={classOptions.map((n) => ({ value: n, label: n }))}
            placeholder="All classes"
            onChange={(v) => setLocal((f) => ({ ...f, className: v }))}
            searchable
          />

          <FilterSelect
            label="Status"
            icon={<Activity className="size-3.5" />}
            value={local.statusFilter}
            options={STATUS_OPTIONS.filter((o) => o.value !== "")}
            placeholder="All statuses"
            onChange={(v) =>
              setLocal((f) => ({ ...f, statusFilter: v as StatusFilterValue }))
            }
          />
        </div>

        {/* Actions */}
        <div className="px-4 pt-2 pb-4 flex gap-3 border-t border-border-card">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="flex-1 h-12 rounded-xl border border-border-card font-body text-sm font-medium text-text-secondary active:bg-background-primary touch-manipulation"
            >
              Clear All
            </button>
          )}
          <button
            type="button"
            onClick={apply}
            className={`h-12 rounded-xl font-body text-sm font-medium text-text-on-dark bg-accent-green active:bg-accent-green-dark touch-manipulation ${
              hasActiveFilters ? "flex-1" : "w-full"
            }`}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
};
