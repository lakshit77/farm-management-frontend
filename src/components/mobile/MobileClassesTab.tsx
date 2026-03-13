import React, { useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  CalendarX2,
  SearchX,
  Award,
  Hash,
  ListOrdered,
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

function formatTimeOnly(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const s = value.trim();
  if (s.includes(" ")) {
    const part = s.split(" ")[1];
    return part ?? s;
  }
  return s;
}

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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-border-card/40 last:border-b-0">
      <span className="text-text-secondary text-xs font-body shrink-0">{label}</span>
      <span className="text-text-primary text-xs font-body text-right tabular-nums">
        {value}
      </span>
    </div>
  );
}

function EntryDetail({
  entry,
  cls,
}: {
  entry: ScheduleEntry;
  cls: ScheduleClass;
}): React.ReactElement {
  const rider = entry.rider?.name ?? "—";
  const scores = [
    entry.score1, entry.score2, entry.score3,
    entry.score4, entry.score5, entry.score6,
  ].filter((s): s is string => s != null && s !== "");

  return (
    <div className="px-3 pb-3 pt-1 bg-surface-card-alt/40">
      <div className="rounded-lg bg-surface-card border border-border-card/60 p-2.5 space-y-2">
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs font-body">
          <span className="text-text-secondary">Rider</span>
          <span className="text-text-primary text-right truncate">{rider}</span>
          <span className="text-text-secondary">Class</span>
          <span className="text-text-primary text-right truncate">
            {cls.class_number ? `${cls.class_number} · ` : ""}{cls.name}
          </span>
          {entry.class_status != null && (
            <>
              <span className="text-text-secondary">Status</span>
              <span className="text-text-primary text-right">{entry.class_status}</span>
            </>
          )}
          {entry.estimated_start != null && (
            <>
              <span className="text-text-secondary">Est. Start</span>
              <span className="text-text-primary text-right tabular-nums">
                {formatTimeOnly(entry.estimated_start)}
              </span>
            </>
          )}
          {entry.placing != null && entry.placing < 100000 && (
            <>
              <span className="text-text-secondary">Placing</span>
              <span className="text-accent-green-dark font-medium text-right">
                #{entry.placing}
              </span>
            </>
          )}
        </div>

        {/* Progress & results */}
        {(entry.total_trips != null || entry.points_earned != null || entry.total_prize_money != null) && (
          <div className="pt-1.5 border-t border-border-card/40">
            <p className="text-[10px] font-medium text-text-secondary uppercase tracking-wide mb-1 flex items-center gap-1">
              <Award className="size-3" aria-hidden /> Results
            </p>
            {entry.total_trips != null && (
              <DetailRow
                label="Trips"
                value={`${entry.completed_trips ?? 0}/${entry.total_trips}`}
              />
            )}
            {entry.points_earned != null && (
              <DetailRow label="Points" value={entry.points_earned} />
            )}
            {entry.total_prize_money != null && (
              <DetailRow label="Prize" value={`$${entry.total_prize_money}`} />
            )}
          </div>
        )}

        {/* Rounds */}
        {(entry.faults_one != null || entry.faults_two != null) && (
          <div className="pt-1.5 border-t border-border-card/40">
            <p className="text-[10px] font-medium text-text-secondary uppercase tracking-wide mb-1 flex items-center gap-1">
              <Hash className="size-3" aria-hidden /> Rounds
            </p>
            <div className="flex gap-4">
              {entry.faults_one != null && (
                <div className="text-xs font-body">
                  <span className="text-text-secondary">R1: </span>
                  <span className="text-text-primary tabular-nums">{entry.faults_one}f</span>
                  {entry.time_one != null && (
                    <span className="text-text-secondary ml-1">{entry.time_one}s</span>
                  )}
                </div>
              )}
              {entry.faults_two != null && (
                <div className="text-xs font-body">
                  <span className="text-text-secondary">R2: </span>
                  <span className="text-text-primary tabular-nums">{entry.faults_two}f</span>
                  {entry.time_two != null && (
                    <span className="text-text-secondary ml-1">{entry.time_two}s</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scores */}
        {scores.length > 0 && (
          <div className="pt-1.5 border-t border-border-card/40">
            <p className="text-[10px] font-medium text-text-secondary uppercase tracking-wide mb-1 flex items-center gap-1">
              <ListOrdered className="size-3" aria-hidden /> Scores
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-body">
              {scores.map((s, i) => (
                <span key={i} className="text-text-primary tabular-nums">
                  <span className="text-text-secondary">S{i + 1}:</span> {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MobileClassesTabProps {
  data: ScheduleViewData | null;
  filters: DashboardFilters;
}

export const MobileClassesTab: React.FC<MobileClassesTabProps> = ({
  data,
  filters,
}) => {
  const [expandedClassIds, setExpandedClassIds] = useState<Set<string>>(
    () => new Set()
  );
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(
    () => new Set()
  );
  const [inactiveSectionExpanded, setInactiveSectionExpanded] = useState(false);

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
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <CalendarX2 className="size-10 text-border-card mb-3" aria-hidden />
        <p className="font-body text-sm text-text-secondary">
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
    <div className="space-y-3 pb-2">
      {hasActiveFilters && filteredEvents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <SearchX className="size-10 text-border-card mb-3" aria-hidden />
          <p className="font-body text-sm text-text-secondary">
            No entries match the current filter.
          </p>
        </div>
      )}

      {filteredEvents.map((event: ScheduleEvent) => (
        <section
          key={event.id}
          className="bg-surface-card rounded-xl border border-border-card overflow-hidden"
        >
          {/* Event header */}
          <div className="px-3.5 py-2 border-b border-border-card">
            <h2 className="font-heading text-sm font-bold text-accent-green-dark truncate">
              {event.name}
              {event.ring_number != null && (
                <span className="font-body font-normal text-text-secondary ml-1.5 text-xs">
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
                className="border-b border-border-card/60 last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => toggleClass(cls.id)}
                  className="w-full px-3.5 py-2.5 bg-surface-card-alt/40 text-left font-body text-xs border-t border-border-card/40 flex items-center gap-2 min-h-[44px] touch-manipulation active:bg-surface-card-alt"
                >
                  <span className="shrink-0 text-text-secondary" aria-hidden>
                    {isClassExpanded ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </span>
                  <span className="font-medium text-text-primary truncate flex-1 min-w-0">
                    {cls.class_number && `${cls.class_number} · `}
                    {cls.name}
                  </span>
                  <span className="text-text-secondary shrink-0 tabular-nums">
                    {cls.entries.length}
                  </span>
                </button>

                {/* Compact entry rows */}
                {isClassExpanded && (
                  <div>
                    {cls.entries.map((entry: ScheduleEntry) => {
                      const horseName = entry.horse?.name ?? "—";
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
                            className="w-full flex items-center gap-2 px-3.5 py-2.5 pl-5 text-left text-xs border-t border-border-card/40 active:bg-surface-card-alt/50 touch-manipulation min-h-[44px]"
                          >
                            <span className="w-12 shrink-0 font-body font-medium text-text-secondary tabular-nums">
                              {timeStr === "—" ? "" : timeStr.slice(0, 5)}
                            </span>
                            <span className="flex-1 font-body font-medium text-text-primary truncate min-w-0">
                              {horseName}
                            </span>
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
                                  ? "Active"
                                  : statusKind === "inactive"
                                    ? "Off"
                                    : "Next"}
                            </Badge>
                            <span className="text-text-secondary shrink-0" aria-hidden>
                              {isEntryExpanded ? (
                                <ChevronDown className="size-3.5" />
                              ) : (
                                <ChevronRight className="size-3.5" />
                              )}
                            </span>
                          </button>
                          {isEntryExpanded && (
                            <EntryDetail entry={entry} cls={cls} />
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

      {/* Inactive entries */}
      {!hasActiveFilters && (data.inactive_entries?.length ?? 0) > 0 && (
        <section className="bg-surface-card rounded-xl border border-border-card overflow-hidden">
          <button
            type="button"
            onClick={() => setInactiveSectionExpanded((prev) => !prev)}
            className="w-full px-3.5 py-2.5 text-left flex items-center gap-2 min-h-[44px] touch-manipulation active:bg-surface-card-alt/50"
          >
            <span className="shrink-0 text-text-secondary" aria-hidden>
              {inactiveSectionExpanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </span>
            <span className="font-heading text-sm font-bold text-accent-green-dark flex-1">
              Not in class
            </span>
            <span className="text-text-secondary text-xs font-body">
              {data.inactive_entries!.length}
            </span>
          </button>
          {inactiveSectionExpanded && (
            <div className="border-t border-border-card divide-y divide-border-card/60">
              {data.inactive_entries!.map((entry: ScheduleEntry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 px-3.5 py-2.5 font-body text-xs min-h-[40px]"
                >
                  <span className="flex-1 font-medium text-text-primary truncate min-w-0">
                    {entry.horse?.name ?? "—"}
                  </span>
                  <span className="text-text-secondary truncate max-w-[6rem]">
                    {entry.rider?.name ?? "—"}
                  </span>
                  <Badge variant="default">Off</Badge>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
