/**
 * Classes & Horses tab: expandable event → class → entry tree filtered by DashboardFilters.
 * Data is passed in from DashboardView; no internal API calls.
 */

import React, { useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  PawPrint,
  User,
  Clock,
  Award,
  Hash,
  ListOrdered,
  CalendarX2,
  SearchX,
} from "lucide-react";
import { Badge } from "../Badge";
import type {
  ScheduleViewData,
  ScheduleEvent,
  ScheduleClass,
  ScheduleEntry,
} from "../../api";
import type { DashboardFilters } from "../FilterBar";
import { entryStatusKind } from "../../utils/entryStatus";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return time-only (HH:MM:SS) from a datetime string. */
function formatTimeOnly(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const s = value.trim();
  if (s.includes(" ")) {
    const part = s.split(" ")[1];
    return part ?? s;
  }
  return s;
}

/** Order-of-go label. */
function orderLabel(entry: ScheduleEntry): string {
  if (entry.order_of_go != null && entry.order_total != null) {
    return `${entry.order_of_go} of ${entry.order_total}`;
  }
  if (entry.order_of_go != null) return String(entry.order_of_go);
  return "—";
}

/** Filter events/classes/entries using DashboardFilters. */
function filterSchedule(
  events: ScheduleEvent[],
  filters: DashboardFilters
): ScheduleEvent[] {
  const horse = filters.horseName.trim().toLowerCase();
  const cls = filters.className.trim().toLowerCase();
  return events
    .map((ev) => ({
      ...ev,
      classes: ev.classes
        .filter((c) => !cls || (c.name ?? "").toLowerCase() === cls)
        .map((c) => ({
          ...c,
          entries: c.entries.filter(
            (e) =>
              (!horse || (e.horse?.name ?? "").toLowerCase() === horse) &&
              (!filters.statusFilter ||
                entryStatusKind(e) === filters.statusFilter)
          ),
        }))
        .filter((c) => c.entries.length > 0),
    }))
    .filter((ev) => ev.classes.length > 0);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border-card/50 last:border-b-0">
      <span className="text-text-secondary text-sm font-body shrink-0">{label}</span>
      <span className="text-text-primary text-sm font-body text-right tabular-nums">
        {value}
      </span>
    </div>
  );
}

function EntryExpandable({
  entry,
  cls,
}: {
  entry: ScheduleEntry;
  cls: ScheduleClass;
}): React.ReactElement {
  const [showFull, setShowFull] = useState(false);
  const horse = entry.horse ?? { name: "", status: "" };
  const rider = entry.rider ?? { name: "" };

  const scores = [
    entry.score1,
    entry.score2,
    entry.score3,
    entry.score4,
    entry.score5,
    entry.score6,
  ].filter((s): s is string => s != null && s !== "");

  const hasFullDetails =
    entry.total_trips != null ||
    entry.points_earned != null ||
    entry.faults_one != null ||
    entry.faults_two != null ||
    scores.length > 0;

  return (
    <div className="px-4 sm:px-5 py-3 sm:py-4 bg-surface-card-alt/60 border-t border-border-card">
      {/* Who & What */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="rounded-lg border border-border-card bg-surface-card px-3 py-2.5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1 flex items-center gap-1.5">
            <BookOpen className="size-3.5" aria-hidden /> Class
          </p>
          <p className="text-sm font-body text-text-primary">
            {cls.class_number && `${cls.class_number} · `}
            {cls.name}
            {cls.class_type && (
              <span className="text-text-secondary font-normal">
                {" "}
                · {cls.class_type}
              </span>
            )}
          </p>
        </div>
        <div className="rounded-lg border border-border-card bg-surface-card px-3 py-2.5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1 flex items-center gap-1.5">
            <PawPrint className="size-3.5" aria-hidden /> Horse
          </p>
          <p className="text-sm font-body text-text-primary">
            {horse.name || "—"}
            {entry.back_number && (
              <span className="text-text-secondary font-normal">
                {" "}
                · Back #{entry.back_number}
              </span>
            )}
          </p>
        </div>
        <div className="rounded-lg border border-border-card bg-surface-card px-3 py-2.5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1 flex items-center gap-1.5">
            <User className="size-3.5" aria-hidden /> Rider
          </p>
          <p className="text-sm font-body text-text-primary">
            {rider.name || "—"}
          </p>
        </div>
      </div>

      {/* Status & Times */}
      <div className="rounded-lg border border-border-card bg-surface-card px-3 py-2.5 mb-4">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Clock className="size-3.5" aria-hidden /> Status & times
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm font-body">
          {entry.class_status != null && (
            <span className="text-text-primary">{entry.class_status}</span>
          )}
          {entry.estimated_start != null && (
            <span className="text-text-secondary">
              Est. {formatTimeOnly(entry.estimated_start)}
            </span>
          )}
          {entry.actual_start != null &&
            formatTimeOnly(entry.actual_start) !== "00:00:00" && (
              <span className="text-text-secondary">
                Actual {formatTimeOnly(entry.actual_start)}
              </span>
            )}
          {entry.placing != null && entry.placing < 100000 && (
            <span className="font-medium text-accent-green-dark">
              Placing {entry.placing}
            </span>
          )}
        </div>
      </div>

      {/* Full details — collapsible */}
      {hasFullDetails && (
        <div className="pt-3 border-t border-border-card">
          <button
            type="button"
            onClick={() => setShowFull((v) => !v)}
            className="font-body text-sm font-medium text-accent-green-dark hover:text-accent-green focus:outline-none focus:underline inline-flex items-center gap-1.5"
          >
            {showFull ? (
              <ChevronDown className="size-4" aria-hidden />
            ) : (
              <ChevronRight className="size-4" aria-hidden />
            )}
            {showFull ? "Hide full details" : "Show full details"}
          </button>

          {showFull && (
            <div className="mt-4 space-y-4">
              {/* Progress */}
              {(entry.total_trips != null ||
                entry.completed_trips != null ||
                entry.remaining_trips != null) && (
                <div className="rounded-lg border border-border-card bg-surface-card px-3 py-2.5">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <ListOrdered className="size-3.5" aria-hidden /> Progress
                  </p>
                  {entry.total_trips != null && (
                    <DetailRow label="Total trips" value={entry.total_trips} />
                  )}
                  {entry.completed_trips != null && (
                    <DetailRow
                      label="Completed"
                      value={entry.completed_trips}
                    />
                  )}
                  {entry.remaining_trips != null && (
                    <DetailRow
                      label="Remaining"
                      value={entry.remaining_trips}
                    />
                  )}
                </div>
              )}

              {/* Results */}
              {(entry.points_earned != null ||
                entry.total_prize_money != null) && (
                <div className="rounded-lg border border-border-card bg-surface-card px-3 py-2.5">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Award className="size-3.5" aria-hidden /> Results
                  </p>
                  {entry.points_earned != null && (
                    <DetailRow
                      label="Points earned"
                      value={entry.points_earned}
                    />
                  )}
                  {entry.total_prize_money != null && (
                    <DetailRow
                      label="Prize money"
                      value={`$${entry.total_prize_money}`}
                    />
                  )}
                </div>
              )}

              {/* Rounds */}
              {(entry.faults_one != null ||
                entry.time_one != null ||
                entry.faults_two != null ||
                entry.time_two != null) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(entry.faults_one != null || entry.time_one != null) && (
                    <div className="rounded-lg border border-border-card bg-surface-card px-3 py-2.5">
                      <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Hash className="size-3.5" aria-hidden /> Round 1
                      </p>
                      {entry.faults_one != null && (
                        <DetailRow label="Faults" value={entry.faults_one} />
                      )}
                      {entry.time_one != null && (
                        <DetailRow label="Time" value={entry.time_one} />
                      )}
                      {entry.disqualify_status_one != null && (
                        <DetailRow
                          label="Disqualify"
                          value={entry.disqualify_status_one}
                        />
                      )}
                    </div>
                  )}
                  {(entry.faults_two != null || entry.time_two != null) && (
                    <div className="rounded-lg border border-border-card bg-surface-card px-3 py-2.5">
                      <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Hash className="size-3.5" aria-hidden /> Round 2
                      </p>
                      {entry.faults_two != null && (
                        <DetailRow label="Faults" value={entry.faults_two} />
                      )}
                      {entry.time_two != null && (
                        <DetailRow label="Time" value={entry.time_two} />
                      )}
                      {entry.disqualify_status_two != null && (
                        <DetailRow
                          label="Disqualify"
                          value={entry.disqualify_status_two}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Scores */}
              {scores.length > 0 && (
                <div className="rounded-lg border border-border-card bg-surface-card px-3 py-2.5">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <ListOrdered className="size-3.5" aria-hidden /> Scores
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-body">
                    {scores.map((s, i) => (
                      <span key={i} className="text-text-primary tabular-nums">
                        <span className="text-text-secondary mr-1">
                          S{i + 1}:
                        </span>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ClassesHorsesTabProps {
  /** Full schedule data for the selected date. */
  data: ScheduleViewData | null;
  /** Current dashboard filters. */
  filters: DashboardFilters;
}

/**
 * Expandable event → class → entry tree with filter awareness.
 * All filtering is done in-memory; no re-fetch on filter change.
 */
export const ClassesHorsesTab: React.FC<ClassesHorsesTabProps> = ({
  data,
  filters,
}) => {
  const [expandedClassIds, setExpandedClassIds] = useState<Set<string>>(
    () => new Set()
  );
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(
    () => new Set()
  );
  const [inactiveSectionExpanded, setInactiveSectionExpanded] =
    useState<boolean>(false);

  const toggleClass = useCallback((id: string) => {
    setExpandedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleEntry = useCallback((id: string) => {
    setExpandedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (!data || (!data.events?.length && !data.inactive_entries?.length)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CalendarX2 className="size-12 text-border-card mb-4" aria-hidden />
        <p className="font-body text-text-secondary">
          No schedule for this date.
        </p>
      </div>
    );
  }

  const filteredEvents = filterSchedule(data.events ?? [], filters);
  const hasActiveFilters =
    filters.horseName !== "" ||
    filters.className !== "" ||
    filters.statusFilter !== "";

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      {/* No results for active filters */}
      {hasActiveFilters && filteredEvents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <SearchX className="size-12 text-border-card mb-4" aria-hidden />
          <p className="font-body text-text-secondary">
            No entries match the current filter.
          </p>
        </div>
      )}

      {/* Events → Classes → Entries */}
      {filteredEvents.map((event: ScheduleEvent) => (
        <section
          key={event.id}
          className="bg-surface-card rounded-card shadow-card overflow-hidden min-w-0"
        >
          {/* Event header */}
          <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-border-card">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-accent-green-dark">
              {event.name}
              {event.ring_number != null && (
                <span className="font-body font-normal text-text-secondary ml-2 text-base">
                  Ring {event.ring_number}
                </span>
              )}
            </h2>
          </div>

          {/* Classes */}
          {event.classes.map((cls: ScheduleClass) => {
            const isClassExpanded = expandedClassIds.has(cls.id);
            return (
              <div
                key={cls.id}
                className="border-b border-border-card/80 last:border-b-0"
              >
                {/* Class row */}
                <button
                  type="button"
                  onClick={() => toggleClass(cls.id)}
                  className="w-full px-4 sm:px-5 py-3 bg-surface-card-alt/50 hover:bg-surface-card-alt text-left font-body text-sm border-t border-border-card/60 cursor-pointer focus:outline-none flex items-center gap-2 min-h-[48px] touch-manipulation"
                >
                  <span className="shrink-0 text-text-secondary" aria-hidden>
                    {isClassExpanded ? (
                      <ChevronDown className="size-5" />
                    ) : (
                      <ChevronRight className="size-5" />
                    )}
                  </span>
                  <span className="font-medium text-text-primary">
                    {cls.class_number && `${cls.class_number} · `}
                    {cls.name}
                  </span>
                  {cls.class_type && (
                    <span className="font-normal text-text-secondary">
                      · {cls.class_type}
                    </span>
                  )}
                  <span className="ml-1.5 text-text-secondary font-normal">
                    ({cls.entries.length}{" "}
                    {cls.entries.length === 1 ? "entry" : "entries"})
                  </span>
                </button>

                {/* Entries */}
                {isClassExpanded && (
                  <div className="min-w-0">
                    {cls.entries.map((entry: ScheduleEntry) => {
                      const horseName = entry.horse?.name ?? "";
                      const riderName = entry.rider?.name ?? "";
                      const timeStr = formatTimeOnly(
                        entry.estimated_start || entry.actual_start
                      );
                      const statusKind = entryStatusKind(entry);
                      const isEntryExpanded = expandedEntryIds.has(entry.id);

                      return (
                        <div key={entry.id}>
                          <button
                            type="button"
                            onClick={() => toggleEntry(entry.id)}
                            className="w-full flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-6 px-4 sm:px-5 py-3 pl-6 sm:pl-8 text-left font-body text-sm border-t border-border-card/60 hover:bg-surface-card-alt/50 cursor-pointer focus:outline-none min-h-[48px] touch-manipulation"
                          >
                            <span className="w-16 sm:w-20 shrink-0 font-medium text-text-primary tabular-nums text-xs sm:text-sm">
                              {timeStr}
                            </span>
                            <span className="min-w-0 flex-1 font-medium text-text-primary truncate text-sm">
                              {horseName}
                            </span>
                            <span className="min-w-0 flex-1 text-text-primary truncate text-sm">
                              {riderName}
                            </span>
                            <span className="shrink-0">
                              <Badge
                                variant={
                                  statusKind === "completed"
                                    ? "green"
                                    : statusKind === "active"
                                      ? "warm"
                                      : "default"
                                }
                              >
                                {statusKind === "completed"
                                  ? "Done"
                                  : statusKind === "active"
                                    ? "In progress"
                                    : statusKind === "inactive"
                                      ? "Inactive"
                                      : "Upcoming"}
                              </Badge>
                            </span>
                            <span className="w-14 shrink-0 text-right text-text-secondary tabular-nums">
                              {orderLabel(entry)}
                            </span>
                            <span
                              className="shrink-0 text-text-secondary"
                              aria-hidden
                            >
                              {isEntryExpanded ? (
                                <ChevronDown className="size-4" />
                              ) : (
                                <ChevronRight className="size-4" />
                              )}
                            </span>
                          </button>
                          {isEntryExpanded && (
                            <EntryExpandable entry={entry} cls={cls} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}

      {/* Inactive entries section */}
      {!hasActiveFilters && (data.inactive_entries?.length ?? 0) > 0 && (
        <section className="bg-surface-card rounded-card shadow-card overflow-hidden">
          <div className="border-b border-border-card/80">
            <button
              type="button"
              onClick={() =>
                setInactiveSectionExpanded((prev) => !prev)
              }
              className="w-full px-4 sm:px-5 py-3 bg-surface-card-alt/50 hover:bg-surface-card-alt text-left font-body text-sm cursor-pointer focus:outline-none flex items-center gap-2 min-h-[48px] touch-manipulation"
            >
              <span className="shrink-0 text-text-secondary" aria-hidden>
                {inactiveSectionExpanded ? (
                  <ChevronDown className="size-5" />
                ) : (
                  <ChevronRight className="size-5" />
                )}
              </span>
              <span className="font-heading text-lg font-bold text-accent-green-dark">
                Horses not in any class
              </span>
              <span className="ml-1.5 text-text-secondary font-normal font-body">
                ({data.inactive_entries!.length}{" "}
                {data.inactive_entries!.length === 1 ? "horse" : "horses"})
              </span>
            </button>
          </div>
          {inactiveSectionExpanded && (
            <>
              <div className="px-5 py-2 border-b border-border-card/60">
                <p className="font-body text-sm text-text-secondary">
                  These horses are in your entries for this show but are not
                  entered in any class.
                </p>
              </div>
              <ul className="divide-y divide-border-card/80">
                {data.inactive_entries!.map((entry: ScheduleEntry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-6 px-4 sm:px-5 py-3 font-body text-sm min-h-[44px]"
                  >
                    <span className="min-w-0 flex-1 font-medium text-text-primary truncate">
                      {entry.horse?.name ?? "—"}
                    </span>
                    <span className="min-w-0 flex-1 text-text-primary truncate">
                      {entry.rider?.name ?? "—"}
                    </span>
                    <span className="shrink-0">
                      <Badge variant="default">Inactive</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
};
