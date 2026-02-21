/**
 * Ring & Horses tab: timetable view where rows are time slots and columns are rings.
 * Each cell shows horse cards for that ring at that time. 8:00 AM has its own row
 * across all rings, 8:30 AM the next, etc. Each unique horse is color-coded.
 * Read-only, mobile-friendly with horizontal scrolling.
 */

import React, { useMemo } from "react";
import { CalendarX2 } from "lucide-react";
import type {
  ScheduleViewData,
  ScheduleEvent,
  ScheduleClass,
  ScheduleEntry,
} from "../../api";
import type { DashboardFilters } from "../FilterBar";
import { entryStatusKind } from "../../utils/entryStatus";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RingEntry {
  entry: ScheduleEntry;
  cls: ScheduleClass;
  event: ScheduleEvent;
  minuteOfDay: number | null;
}

interface TimeSlot {
  /** Minutes since midnight (start of slot). */
  minuteStart: number;
  /** Display label. */
  label: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SLOT_INTERVAL_MINUTES = 30;
const BUFFER_MINUTES = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse "HH:MM:SS" or "YYYY-MM-DD HH:MM:SS" to minutes since midnight. */
function toMinuteOfDay(value: string | null | undefined): number | null {
  if (!value) return null;
  const s = value.trim();
  const timePart = s.includes(" ") ? s.split(" ")[1] : s;
  if (!timePart) return null;
  const [h, m] = timePart.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/** Format minutes-since-midnight to "H:MM AM/PM". */
function minutesToTimeLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * Generate a unique color for each horse by index.
 * Uses HSL with golden-ratio hue distribution for maximum distinction.
 */
function horseIndexToColor(index: number): string {
  const hue = (index * 137.5) % 360; // Golden angle for good distribution
  const saturation = 65;
  const lightness = 40;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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
              (!horse ||
                (e.horse?.name ?? "").toLowerCase() === horse) &&
              (!filters.statusFilter ||
                entryStatusKind(e) === filters.statusFilter)
          ),
        }))
        .filter((c) => c.entries.length > 0),
    }))
    .filter((ev) => ev.classes.length > 0);
}

// ---------------------------------------------------------------------------
// Horse card with hover tooltip
// ---------------------------------------------------------------------------

function HorseCard({
  entry,
  cls,
  color,
  timeLabel,
}: {
  entry: ScheduleEntry;
  cls: ScheduleClass;
  color: string;
  timeLabel: string;
}): React.ReactElement {
  const [showTooltip, setShowTooltip] = React.useState(false);
  const horseName = entry.horse?.name ?? "Unknown";
  const riderName = entry.rider?.name ?? null;
  const status = entry.status ?? "";
  const classStatus = entry.class_status ?? "";
  const placing = entry.placing != null && entry.placing < 100000 ? entry.placing : null;
  const backNumber = entry.back_number ?? "—";

  const tooltipLines: string[] = [
    riderName ? `Rider: ${riderName}` : "",
    `Class: ${cls.class_number ? `#${cls.class_number}` : ""} ${cls.name}`,
    `Status: ${classStatus || status}`,
    placing != null ? `Placing: #${placing}` : "",
    backNumber !== "—" ? `Back #: ${backNumber}` : "",
  ].filter(Boolean);

  const tooltipText = tooltipLines.join(" · ");

  return (
    <div
      className="group relative rounded border border-border-card px-2 py-1.5 sm:py-1 shadow-sm transition-shadow hover:shadow-md touch-manipulation min-h-[44px] sm:min-h-0 flex items-center"
      style={{
        backgroundColor: color,
      }}
      title={tooltipText}
      onPointerEnter={() => setShowTooltip(true)}
      onPointerLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setShowTooltip((v) => !v);
        }
      }}
      role="button"
      tabIndex={0}
      aria-expanded={showTooltip}
      aria-label={`${horseName} at ${timeLabel}. ${showTooltip ? "Hide" : "Show"} details`}
    >
      <p className="font-body text-xs text-white truncate drop-shadow-sm flex-1 min-w-0">
        <span className="font-medium">{horseName}</span>
        <span className="text-white/90 mx-1">·</span>
        <span className="text-white/90">{timeLabel}</span>
      </p>

      {/* Tooltip: hover on desktop, tap on touch */}
      <div
        className={`absolute left-0 right-0 top-full z-10 mt-0.5 rounded border border-border-card bg-surface-card shadow-card px-2 py-1.5 text-xs font-body max-w-xs ${
          showTooltip ? "block" : "hidden group-hover:block"
        }`}
        role="tooltip"
      >
        <p className="font-semibold text-text-primary mb-1">{horseName}</p>
        {tooltipLines.map((line, i) => (
          <p key={i} className="text-text-secondary">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface RingHorsesTabProps {
  /** Full schedule data for the selected date. */
  data: ScheduleViewData | null;
  /** Current dashboard filters. */
  filters: DashboardFilters;
}

/**
 * Ring & Horses tab: timetable view. Rows = time slots (8:00, 8:30, ...),
 * columns = rings. Each cell shows horse cards for that ring at that time.
 * Same time has the same row across all rings. Color-coded by horse.
 */
export const RingHorsesTab: React.FC<RingHorsesTabProps> = ({ data, filters }) => {
  const {
    rings,
    timeSlots,
    entriesByRingAndSlot,
    horseToColor,
    uniqueHorses,
  } = useMemo(() => {
    if (!data?.events) {
      return {
        rings: [],
        timeSlots: [],
        entriesByRingAndSlot: new Map<string, RingEntry[]>(),
        horseToColor: new Map<string, string>(),
        uniqueHorses: [],
      };
    }

    const filtered = filterSchedule(data.events, filters);
    const allEntries: RingEntry[] = [];

    for (const ev of filtered) {
      for (const cls of ev.classes) {
        for (const entry of cls.entries) {
          const timeStr = entry.estimated_start ?? entry.actual_start;
          const minuteOfDay = toMinuteOfDay(timeStr);
          allEntries.push({ entry, cls, event: ev, minuteOfDay });
        }
      }
    }

    if (allEntries.length === 0) {
      return {
        rings: [],
        timeSlots: [],
        entriesByRingAndSlot: new Map<string, RingEntry[]>(),
        horseToColor: new Map<string, string>(),
        uniqueHorses: [],
      };
    }

    const minutesWithTimes = allEntries
      .map((e) => e.minuteOfDay)
      .filter((m): m is number => m != null);

    const earliest = Math.min(...minutesWithTimes);
    const latest = Math.max(...minutesWithTimes);
    const rangeStart = Math.max(0, earliest - BUFFER_MINUTES);
    const rangeEnd = Math.min(24 * 60 - 1, latest + BUFFER_MINUTES);

    const slots: TimeSlot[] = [];
    for (let m = rangeStart; m <= rangeEnd; m += SLOT_INTERVAL_MINUTES) {
      slots.push({ minuteStart: m, label: minutesToTimeLabel(m) });
    }

    const ringsSorted = [...filtered].sort(
      (a, b) => (a.ring_number ?? 0) - (b.ring_number ?? 0)
    );

    const entriesByRingAndSlot = new Map<string, RingEntry[]>() as Map<
      string,
      RingEntry[]
    >;

    const UNSCHEDULED_KEY = "unscheduled";

    for (const re of allEntries) {
      const ringKey = re.event.id;
      const slotMin =
        re.minuteOfDay != null
          ? Math.floor(re.minuteOfDay / SLOT_INTERVAL_MINUTES) * SLOT_INTERVAL_MINUTES
          : null;
      const cellKey = slotMin != null ? `${ringKey}-${slotMin}` : `${ringKey}-${UNSCHEDULED_KEY}`;
      if (!entriesByRingAndSlot.has(cellKey)) {
        entriesByRingAndSlot.set(cellKey, []);
      }
      entriesByRingAndSlot.get(cellKey)!.push(re);
    }

    for (const [, entries] of entriesByRingAndSlot) {
      entries.sort((a, b) => (a.minuteOfDay ?? 9999) - (b.minuteOfDay ?? 9999));
    }

    // Build unique horse -> color map (each horse gets a unique color)
    const horseIds = Array.from(
      new Set(allEntries.map((e) => e.entry.horse.id))
    ).sort();
    const horseToColor = new Map<string, string>();
    horseIds.forEach((id, idx) => {
      horseToColor.set(id, horseIndexToColor(idx));
    });
    const uniqueHorses = horseIds.map((id) => {
      const entry = allEntries.find((e) => e.entry.horse.id === id);
      return { id, name: entry?.entry.horse?.name ?? "Unknown" };
    });

    return {
      rings: ringsSorted,
      timeSlots: slots,
      entriesByRingAndSlot,
      horseToColor,
      uniqueHorses,
    };
  }, [data, filters]);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CalendarX2 className="size-12 text-border-card mb-4" aria-hidden />
        <p className="font-body text-text-secondary">No schedule for this date.</p>
      </div>
    );
  }

  if (rings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CalendarX2 className="size-12 text-border-card mb-4" aria-hidden />
        <p className="font-body text-text-secondary">
          No data to display for the current filter.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 min-w-0">
      <p className="font-body text-xs text-text-secondary">
        Hover or tap for details. Each horse has a unique color.
      </p>

      <div className="overflow-x-auto -mx-3 sm:mx-0 rounded-card border border-border-card bg-surface-card shadow-card overflow-hidden">
        <table className="w-full border-collapse min-w-max">
          <thead>
            <tr className="border-b border-border-card bg-[#F0F5F0]">
              <th className="w-16 shrink-0 px-2 py-1.5 text-left font-body text-xs font-semibold text-accent-green-dark sticky left-0 bg-[#F0F5F0] z-20 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.08)]">
                Time
              </th>
              {rings.map((ring) => (
                <th
                  key={ring.id}
                  className="min-w-[140px] max-w-[180px] px-2 py-1.5 text-left font-body text-xs font-semibold text-accent-green-dark border-l border-border-card"
                >
                  <span className="block">Ring {ring.ring_number}</span>
                  <span className="block text-[10px] font-normal text-text-secondary truncate">
                    {ring.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots
              .filter((slot) =>
                rings.some((ring) => {
                  const cellKey = `${ring.id}-${slot.minuteStart}`;
                  return (entriesByRingAndSlot.get(cellKey) ?? []).length > 0;
                })
              )
              .map((slot) => (
                <tr
                  key={slot.minuteStart}
                  className="border-b border-border-card/50 hover:bg-surface-card-alt/30 transition-colors"
                >
                  <td className="px-2 py-1 font-body text-xs font-medium text-text-secondary sticky left-0 bg-white z-20 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.08)] border-r border-border-card whitespace-nowrap">
                    {slot.label}
                  </td>
                  {rings.map((ring) => {
                    const cellKey = `${ring.id}-${slot.minuteStart}`;
                    const entries = entriesByRingAndSlot.get(cellKey) ?? [];
                    return (
                      <td
                        key={ring.id}
                        className="px-2 py-1 align-top border-l border-border-card min-w-[140px] max-w-[180px]"
                      >
                        <div className="space-y-1">
                          {entries.map((re) => (
                            <HorseCard
                              key={re.entry.id}
                              entry={re.entry}
                              cls={re.cls}
                              color={
                                horseToColor.get(re.entry.horse.id) ?? "#6B6B6B"
                              }
                              timeLabel={
                                re.minuteOfDay != null
                                  ? minutesToTimeLabel(re.minuteOfDay)
                                  : "Unscheduled"
                              }
                            />
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            {/* Unscheduled row - one per ring, shown at bottom */}
            {rings.some((ring) => {
              const unscheduled = entriesByRingAndSlot.get(`${ring.id}-unscheduled`) ?? [];
              return unscheduled.length > 0;
            }) && (
              <tr className="border-b border-border-card/50 bg-[#F5F5F5]">
                <td className="px-2 py-1 font-body text-xs font-medium text-text-secondary sticky left-0 bg-[#F5F5F5] z-20 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.08)] border-r border-border-card whitespace-nowrap">
                  Unscheduled
                </td>
                {rings.map((ring) => {
                  const unscheduled =
                    entriesByRingAndSlot.get(`${ring.id}-unscheduled`) ?? [];
                  return (
                    <td
                      key={ring.id}
                      className="px-2 py-1 align-top border-l border-border-card min-w-[140px] max-w-[180px]"
                    >
                      <div className="space-y-1">
                        {unscheduled.map((re) => (
                          <HorseCard
                            key={re.entry.id}
                            entry={re.entry}
                            cls={re.cls}
                            color={
                              horseToColor.get(re.entry.horse.id) ?? "#6B6B6B"
                            }
                            timeLabel="Unscheduled"
                          />
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Horse color legend - compact, scrollable on mobile */}
      {uniqueHorses.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-card overflow-x-auto overflow-y-hidden scrollbar-hide -mx-3 sm:mx-0 px-3 sm:px-0">
          <span className="font-body text-[10px] font-medium text-text-secondary shrink-0">
            Horses:
          </span>
          {uniqueHorses.slice(0, 20).map((h) => (
            <span
              key={h.id}
              className="flex items-center gap-1 text-[10px] font-body shrink-0"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: horseToColor.get(h.id) ?? "#6B6B6B" }}
                aria-hidden
              />
              <span className="text-text-primary truncate max-w-20">{h.name}</span>
            </span>
          ))}
          {uniqueHorses.length > 20 && (
            <span className="text-[10px] text-text-secondary">
              +{uniqueHorses.length - 20} more
            </span>
          )}
        </div>
      )}
    </div>
  );
};
