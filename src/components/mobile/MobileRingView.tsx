import React, { useMemo, useState } from "react";
import { CalendarX2 } from "lucide-react";
import type {
  ScheduleViewData,
  ScheduleEvent,
  ScheduleClass,
  ScheduleEntry,
} from "../../api";
import type { DashboardFilters } from "../FilterBar";
import { entryStatusKind } from "../../utils/entryStatus";

const STATUS_LABELS: Record<string, string> = {
  completed: "Done",
  active: "In progress",
  upcoming: "Upcoming",
  inactive: "Inactive",
};

const STATUS_COLORS: Record<string, string> = {
  completed: "#4F6D4F",
  active: "#B18A5D",
  upcoming: "#9CA3AF",
  inactive: "#D1D5DB",
};

function toMinuteOfDay(value: string | null | undefined): number | null {
  if (!value) return null;
  const s = value.trim();
  const timePart = s.includes(" ") ? s.split(" ")[1] : s;
  if (!timePart) return null;
  const [h, m] = timePart.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function minutesToTimeLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

function horseIndexToColor(index: number): string {
  const hue = (index * 137.5) % 360;
  return `hsl(${hue}, 65%, 40%)`;
}

interface RingEntry {
  entry: ScheduleEntry;
  cls: ScheduleClass;
  minuteOfDay: number | null;
}

interface MobileRingViewProps {
  data: ScheduleViewData | null;
  filters: DashboardFilters;
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
        .filter((c) => !cls || (c.name ?? "").trim().toLowerCase() === cls)
        .map((c) => ({
          ...c,
          entries: c.entries.filter((e) => {
            const entryHorse = (e.horse?.name ?? "").trim().toLowerCase();
            const horseMatch = !horse || entryHorse === horse;
            const statusMatch =
              !filters.statusFilter ||
              entryStatusKind(e) === filters.statusFilter;
            return horseMatch && statusMatch;
          }),
        }))
        .filter((c) => c.entries.length > 0),
    }))
    .filter((ev) => ev.classes.length > 0);
}

export const MobileRingView: React.FC<MobileRingViewProps> = ({
  data,
  filters,
}) => {
  const [selectedRingIdx, setSelectedRingIdx] = useState(0);

  const { rings, ringEntries, horseToColor } = useMemo(() => {
    if (!data?.events)
      return {
        rings: [] as ScheduleEvent[],
        ringEntries: new Map<string, RingEntry[]>(),
        horseToColor: new Map<string, string>(),
      };

    const filtered = filterSchedule(data.events, filters);
    const allEntries: (RingEntry & { event: ScheduleEvent })[] = [];

    for (const ev of filtered) {
      for (const cls of ev.classes) {
        for (const entry of cls.entries) {
          const timeStr = entry.estimated_start ?? entry.actual_start;
          allEntries.push({
            entry,
            cls,
            event: ev,
            minuteOfDay: toMinuteOfDay(timeStr),
          });
        }
      }
    }

    const ringsSorted = [...filtered].sort(
      (a, b) => (a.ring_number ?? 0) - (b.ring_number ?? 0)
    );

    const byRing = new Map<string, RingEntry[]>();
    for (const re of allEntries) {
      const key = re.event.id;
      if (!byRing.has(key)) byRing.set(key, []);
      byRing.get(key)!.push(re);
    }
    for (const [, entries] of byRing) {
      entries.sort(
        (a, b) => (a.minuteOfDay ?? 9999) - (b.minuteOfDay ?? 9999)
      );
    }

    const horseIds = Array.from(
      new Set(allEntries.map((e) => e.entry.horse.id))
    ).sort();
    const colors = new Map<string, string>();
    horseIds.forEach((id, idx) => colors.set(id, horseIndexToColor(idx)));

    return { rings: ringsSorted, ringEntries: byRing, horseToColor: colors };
  }, [data, filters]);

  if (!data || rings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <CalendarX2 className="size-10 text-border-card mb-3" aria-hidden />
        <p className="font-body text-sm text-text-secondary">
          No ring data for the current filter.
        </p>
      </div>
    );
  }

  const activeRing = rings[selectedRingIdx] ?? rings[0];
  const entries = ringEntries.get(activeRing.id) ?? [];

  const scheduled = entries.filter((e) => e.minuteOfDay != null);
  const unscheduled = entries.filter((e) => e.minuteOfDay == null);

  return (
    <div className="space-y-3 pb-2">
      {/* Ring selector pills */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-3 px-3 py-1">
        {rings.map((ring, i) => {
          const isActive = i === selectedRingIdx;
          const count = ringEntries.get(ring.id)?.length ?? 0;
          return (
            <button
              key={ring.id}
              type="button"
              onClick={() => setSelectedRingIdx(i)}
              className={`shrink-0 px-3.5 py-2 rounded-full font-body text-xs font-medium transition-colors touch-manipulation ${
                isActive
                  ? "bg-accent-green text-white"
                  : "bg-surface-card border border-border-card text-text-secondary active:bg-surface-card-alt"
              }`}
            >
              Ring {ring.ring_number ?? i + 1}
              <span className={`ml-1 ${isActive ? "text-white/80" : "text-text-secondary/70"}`}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Ring name subtitle */}
      <p className="font-body text-xs text-text-secondary px-0.5 truncate">
        {activeRing.name}
      </p>

      {/* Timeline cards */}
      {entries.length === 0 ? (
        <div className="py-8 text-center">
          <p className="font-body text-sm text-text-secondary">
            No entries in this ring.
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {scheduled.map((re, i) => {
            const horseName = re.entry.horse?.name ?? "Unknown";
            const riderName = re.entry.rider?.name ?? null;
            const status = entryStatusKind(re.entry);
            const color = horseToColor.get(re.entry.horse.id) ?? "#6B6B6B";
            const timeLabel = re.minuteOfDay != null ? minutesToTimeLabel(re.minuteOfDay) : "";
            const placing =
              re.entry.placing != null && re.entry.placing < 100000
                ? re.entry.placing
                : null;
            const className = re.cls.class_number
              ? `#${re.cls.class_number} ${re.cls.name}`
              : re.cls.name;

            const showTimeDivider =
              i === 0 ||
              scheduled[i - 1]?.minuteOfDay !== re.minuteOfDay;

            return (
              <React.Fragment key={re.entry.id}>
                {showTimeDivider && (
                  <div className="flex items-center gap-2 pt-2 pb-1">
                    <span className="font-body text-[11px] font-semibold text-accent-green-dark tabular-nums">
                      {timeLabel}
                    </span>
                    <span className="flex-1 h-px bg-border-card" />
                  </div>
                )}
                <div
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1 border border-border-card/60"
                  style={{ borderLeftWidth: 3, borderLeftColor: color }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-medium text-text-primary truncate">
                      {horseName}
                    </p>
                    <p className="font-body text-[11px] text-text-secondary truncate">
                      {riderName && `${riderName} · `}{className}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {placing != null && (
                      <span className="font-body text-xs font-medium text-accent-green-dark tabular-nums">
                        #{placing}
                      </span>
                    )}
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                      style={{ background: STATUS_COLORS[status] ?? "#9CA3AF" }}
                    >
                      {STATUS_LABELS[status] ?? status}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {/* Unscheduled entries */}
          {unscheduled.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-3 pb-1">
                <span className="font-body text-[11px] font-semibold text-text-secondary">
                  Unscheduled
                </span>
                <span className="flex-1 h-px bg-border-card" />
              </div>
              {unscheduled.map((re) => {
                const horseName = re.entry.horse?.name ?? "Unknown";
                const riderName = re.entry.rider?.name ?? null;
                const status = entryStatusKind(re.entry);
                const color = horseToColor.get(re.entry.horse.id) ?? "#6B6B6B";
                const className = re.cls.class_number
                  ? `#${re.cls.class_number} ${re.cls.name}`
                  : re.cls.name;

                return (
                  <div
                    key={re.entry.id}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1 border border-border-card/60"
                    style={{ borderLeftWidth: 3, borderLeftColor: color }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm font-medium text-text-primary truncate">
                        {horseName}
                      </p>
                      <p className="font-body text-[11px] text-text-secondary truncate">
                        {riderName && `${riderName} · `}{className}
                      </p>
                    </div>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white shrink-0"
                      style={{ background: STATUS_COLORS[status] ?? "#9CA3AF" }}
                    >
                      {STATUS_LABELS[status] ?? status}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Horse color legend */}
      {entries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-card">
          <span className="font-body text-[10px] font-medium text-text-secondary shrink-0">
            Horses:
          </span>
          {Array.from(
            new Map(
              entries.map((re) => [
                re.entry.horse.id,
                {
                  id: re.entry.horse.id,
                  name: re.entry.horse?.name ?? "Unknown",
                },
              ])
            ).values()
          )
            .slice(0, 15)
            .map((h) => (
              <span
                key={h.id}
                className="flex items-center gap-1 text-[10px] font-body shrink-0"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: horseToColor.get(h.id) ?? "#6B6B6B",
                  }}
                  aria-hidden
                />
                <span className="text-text-primary truncate max-w-[5rem]">
                  {h.name}
                </span>
              </span>
            ))}
        </div>
      )}
    </div>
  );
};
