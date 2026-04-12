/**
 * ShowEntriesView — full-screen overlay listing all show entries.
 *
 * Features:
 * - Text filters (horse, rider, trainer, owner) in a bottom sheet to save vertical space
 * - Filter chips: All | My Entries | Selected | Unselected (horizontally scrollable on narrow screens)
 * - Toggle switch per entry for monitoring selection (optimistic save)
 * - Paginated (50/page) with "Load More" button
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, ListFilter, Loader2, X } from "lucide-react";
import {
  ALL_ENTRIES_API,
  TOGGLE_ENTRY_API,
  getApiHeaders,
  type AllEntryItem,
} from "../api";

interface ShowEntriesViewProps {
  onClose: () => void;
}

type FilterMode = "all" | "own" | "selected" | "unselected";

interface Filters {
  horse_name: string;
  rider_name: string;
  trainer_name: string;
  owner_name: string;
}

const EMPTY_FILTERS: Filters = {
  horse_name: "",
  rider_name: "",
  trainer_name: "",
  owner_name: "",
};

const PAGE_SIZE = 50;

/**
 * Formats a horse name for display when the API returns all-caps strings.
 * Uses simple title case per word; does not interpret barn-name exceptions (e.g. "Mc").
 */
function formatEntryHorseName(raw: string): string {
  if (!raw.trim()) return raw;
  return raw
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word.length === 1) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Title-cases rider lists or other comma-separated person strings from the API.
 */
function formatPersonDisplay(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  return raw
    .split(",")
    .map((part) => formatEntryHorseName(part.trim()))
    .filter(Boolean)
    .join(", ");
}

export const ShowEntriesView: React.FC<ShowEntriesViewProps> = ({ onClose }) => {
  const [entries, setEntries] = useState<AllEntryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [showName, setShowName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const activeFilterCount = Object.values(filters).filter((v) => v.trim() !== "").length;

  const fetchEntries = useCallback(
    async (
      pageNum: number,
      currentFilters: Filters,
      currentMode: FilterMode,
      append = false,
    ) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        if (ALL_ENTRIES_API.useMockData) {
          if (pageNum === 1) setEntries([]);
          setTotalCount(0);
          return;
        }

        const params: Record<string, unknown> = {
          page: pageNum,
          page_size: PAGE_SIZE,
        };
        if (currentFilters.horse_name.trim()) params.horse_name = currentFilters.horse_name.trim();
        if (currentFilters.rider_name.trim()) params.rider_name = currentFilters.rider_name.trim();
        if (currentFilters.trainer_name.trim()) params.trainer_name = currentFilters.trainer_name.trim();
        if (currentFilters.owner_name.trim()) params.owner_name = currentFilters.owner_name.trim();
        if (currentMode === "own") params.is_own = true;
        if (currentMode === "selected") params.is_selected = true;
        if (currentMode === "unselected") params.is_selected = false;

        const url = ALL_ENTRIES_API.url(params as Parameters<typeof ALL_ENTRIES_API.url>[0]);
        const res = await fetch(url, { headers: getApiHeaders() });
        const json = await res.json();

        if (json.status === 1 && json.data) {
          const newEntries: AllEntryItem[] = json.data.entries ?? [];
          if (append) {
            setEntries((prev) => [...prev, ...newEntries]);
          } else {
            setEntries(newEntries);
          }
          setTotalCount(json.data.total_count ?? 0);
          setShowName(json.data.show_name ?? null);
        }
      } catch (err) {
        console.error("Failed to fetch all entries:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  // Debounced fetch on filter/mode changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchEntries(1, filters, filterMode);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, filterMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEntries(nextPage, filters, filterMode, true);
  };

  const handleToggle = async (entry: AllEntryItem) => {
    const newSelected = !entry.is_selected;
    setTogglingIds((prev) => new Set(prev).add(entry.id));

    // Optimistic update
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entry.id ? { ...e, is_selected: newSelected } : e,
      ),
    );

    try {
      const url = TOGGLE_ENTRY_API.url(entry.id, newSelected);
      const res = await fetch(url, {
        method: TOGGLE_ENTRY_API.method,
        headers: getApiHeaders(),
      });
      const json = await res.json();

      if (json.status !== 1) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id ? { ...e, is_selected: !newSelected } : e,
          ),
        );
      }
    } catch {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, is_selected: !newSelected } : e,
        ),
      );
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
  };

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
  };

  const hasMore = entries.length < totalCount;

  const filterModes: { key: FilterMode; label: string }[] = [
    { key: "all", label: "All" },
    { key: "own", label: "My entries" },
    { key: "selected", label: "Selected" },
    { key: "unselected", label: "Not tracked" },
  ];

  return (
    <div className="flex flex-col h-full bg-background-primary">
      {/* Header — safe-area insets + vertically centered back control */}
      <header className="safe-area-top shrink-0 border-b border-border-card bg-surface-card shadow-card">
        <div className="flex items-center gap-3 px-4 py-3.5 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-10 w-10 text-text-secondary bg-background-primary border border-border-card hover:border-accent-green/40 hover:bg-surface-card rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-green focus:ring-offset-2 transition-colors shrink-0"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </button>

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
              <h1 className="font-heading text-lg font-semibold leading-snug text-text-primary">
                Show Entries
              </h1>
              <span className="inline-flex items-center rounded-full border border-accent-green/25 bg-accent-green/10 px-2.5 py-0.5 font-body text-[11px] font-medium tabular-nums text-accent-green-dark sm:text-xs">
                {loading ? "…" : `${totalCount.toLocaleString()} ${totalCount === 1 ? "entry" : "entries"}`}
              </span>
            </div>
            {showName && (
              <p className="font-body text-[11px] leading-snug text-text-secondary line-clamp-2 sm:text-xs">
                {showName}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Scope chips (full-width scroll) + refine on its own row so labels are never clipped */}
      <div className="shrink-0 space-y-2 border-b border-border-card/80 bg-background-primary px-4 pb-2.5 pt-3 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]">
        <div className="relative">
          <div
            className="-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 pr-3 scrollbar-hide"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {filterModes.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilterMode(f.key)}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-2 font-body text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-green focus:ring-offset-1 ${
                  filterMode === f.key
                    ? "border-accent-green-dark bg-accent-green-dark text-white shadow-sm"
                    : "border-border-card bg-surface-card text-text-primary hover:border-accent-green/35"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFilterSheetOpen(true)}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2 font-body text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-green focus:ring-offset-1 touch-manipulation sm:w-auto sm:self-end ${
            activeFilterCount > 0
              ? "border-accent-green-dark bg-accent-green-dark text-white"
              : "border-border-card bg-surface-card text-text-secondary hover:border-accent-green/35"
          }`}
          aria-expanded={filterSheetOpen}
          aria-haspopup="dialog"
        >
          <ListFilter className="size-3.5 shrink-0" aria-hidden />
          <span>Refine by name</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 font-body text-[10px] font-bold text-accent-green-dark">
              {activeFilterCount}
            </span>
          )}
        </button>

        <p className="font-body text-[11px] leading-snug text-text-secondary/90">
          Switches save immediately for monitoring.
        </p>
      </div>

      <EntriesFilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        filters={filters}
        onChange={updateFilter}
        onClear={clearFilters}
        activeFilterCount={activeFilterCount}
      />

      {/* Entry list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-text-secondary" aria-hidden />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <p className="font-body text-sm text-text-secondary">
              {activeFilterCount > 0 || filterMode !== "all"
                ? "No entries match your filters."
                : "No entries found."}
            </p>
          </div>
        ) : (
          <ul className="list-none space-y-2 p-3 pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))]">
            {entries.map((entry) => {
              const horseDisplay = formatEntryHorseName(entry.horse_name);
              const riderDisplay = formatPersonDisplay(entry.rider_list);
              const trainerDisplay = entry.trainer_name
                ? formatEntryHorseName(entry.trainer_name)
                : "";
              const ownerDisplay = entry.owner_name ? formatEntryHorseName(entry.owner_name) : "";
              const showOwnBadge = entry.is_own_entry && filterMode !== "own";
              const metaParts = [trainerDisplay && `Trainer ${trainerDisplay}`, ownerDisplay && `Owner ${ownerDisplay}`].filter(
                Boolean,
              ) as string[];

              return (
                <li
                  key={entry.id}
                  className={`overflow-hidden rounded-xl border bg-surface-card shadow-card transition-colors ${
                    entry.is_selected
                      ? "border-accent-green/35 border-l-[3px] border-l-accent-green-dark ring-1 ring-accent-green/10"
                      : "border-border-card hover:border-border-card-accent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 p-2.5 sm:gap-3 sm:p-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="font-body text-[11px] font-semibold tabular-nums text-text-secondary">
                          #{entry.back_number || "—"}
                        </span>
                        <span className="min-w-0 font-body text-sm font-semibold leading-snug text-text-primary">
                          {horseDisplay}
                        </span>
                        {showOwnBadge && (
                          <span className="inline-flex h-5 shrink-0 items-center rounded-md border border-accent-green/25 bg-accent-green/12 px-1.5 font-body text-[10px] font-semibold uppercase tracking-wide text-accent-green-dark">
                            Own
                          </span>
                        )}
                      </div>
                      {riderDisplay && (
                        <p className="font-body text-xs leading-snug text-text-secondary">
                          <span className="text-text-secondary/75">Rider</span> {riderDisplay}
                        </p>
                      )}
                      {metaParts.length > 0 && (
                        <p className="font-body text-[11px] leading-snug text-text-secondary/90 line-clamp-2">
                          {metaParts.join(" · ")}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-center gap-0.5 self-center">
                      <span className="hidden font-body text-[9px] font-medium uppercase tracking-wide text-text-secondary/70 sm:block">
                        Track
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={entry.is_selected}
                        aria-label={`${entry.is_selected ? "Stop tracking" : "Track"} ${horseDisplay} for monitoring`}
                        disabled={togglingIds.has(entry.id)}
                        onClick={() => handleToggle(entry)}
                        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-green focus:ring-offset-2 ${
                          entry.is_selected ? "bg-accent-green-dark" : "bg-border-card"
                        } ${togglingIds.has(entry.id) ? "cursor-wait opacity-50" : "cursor-pointer"}`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                            entry.is_selected ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}

            {/* Load more */}
            {hasMore && (
              <li className="flex justify-center py-3 list-none">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 h-10 px-5 font-body text-sm font-medium text-accent-green-dark bg-surface-card border border-border-card hover:bg-background-primary hover:border-accent-green/30 disabled:opacity-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-green focus:ring-offset-2 transition-colors shadow-sm"
                >
                  {loadingMore ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  <span>
                    {loadingMore
                      ? "Loading..."
                      : `Load more (${entries.length} of ${totalCount.toLocaleString()})`}
                  </span>
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

/** Bottom sheet for text filters — keeps the entry list visible on small screens. */
function EntriesFilterSheet({
  open,
  onClose,
  filters,
  onChange,
  onClear,
  activeFilterCount,
}: {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onChange: (key: keyof Filters, value: string) => void;
  onClear: () => void;
  activeFilterCount: number;
}): React.ReactElement | null {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[85] bg-black/45 filter-sheet-backdrop cursor-default border-0 p-0"
        aria-label="Close filter sheet"
        onClick={onClose}
      />
      <div
        id="entries-filter-sheet"
        className="fixed bottom-0 left-0 right-0 z-[90] max-h-[min(88vh,560px)] flex flex-col bg-surface-card rounded-t-2xl shadow-lg border-t border-border-card filter-sheet-enter safe-area-bottom"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entries-filter-sheet-title"
      >
        <div className="flex justify-center pt-2 pb-1" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-border-card" />
        </div>
        <div className="flex items-center justify-between gap-3 px-4 pb-2 border-b border-border-card/80">
          <h2 id="entries-filter-sheet-title" className="font-heading text-base font-semibold text-text-primary">
            Refine list
          </h2>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="font-body text-sm font-medium text-accent-green-dark hover:underline focus:outline-none focus:ring-2 focus:ring-accent-green rounded px-1"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 py-4 space-y-4 flex-1 min-h-0">
          <FilterInput
            label="Horse"
            value={filters.horse_name}
            onChange={(v) => onChange("horse_name", v)}
            placeholder="Name contains…"
          />
          <FilterInput
            label="Rider"
            value={filters.rider_name}
            onChange={(v) => onChange("rider_name", v)}
            placeholder="Name contains…"
          />
          <FilterInput
            label="Trainer"
            value={filters.trainer_name}
            onChange={(v) => onChange("trainer_name", v)}
            placeholder="Name contains…"
          />
          <FilterInput
            label="Owner"
            value={filters.owner_name}
            onChange={(v) => onChange("owner_name", v)}
            placeholder="Name contains…"
          />
        </div>
        <div className="px-4 pb-4 pt-2 border-t border-border-card bg-surface-card">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-xl font-body text-sm font-semibold text-white bg-accent-green-dark hover:bg-accent-green-alt focus:outline-none focus:ring-2 focus:ring-accent-green focus:ring-offset-2 transition-colors touch-manipulation"
          >
            Done
          </button>
          <p className="mt-2 text-center font-body text-[11px] text-text-secondary">
            Results update as you type. Tap Done to return to the list.
          </p>
        </div>
      </div>
    </>
  );
}

/** Compact filter input with label. */
function FilterInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-body text-xs font-medium text-text-secondary">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-11 px-3 pr-9 font-body text-sm text-text-primary bg-background-primary border border-border-card rounded-xl placeholder:text-text-secondary/55 focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-accent-green/40 transition-colors"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-text-secondary hover:text-text-primary rounded transition-colors"
            aria-label={`Clear ${label} filter`}
          >
            <X className="size-3" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
