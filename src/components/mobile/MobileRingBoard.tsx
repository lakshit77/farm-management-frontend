/**
 * MobileRingBoard: Dense single-screen timetable grid for the "Board" tab.
 * Columns = rings, rows = time slots, cells = abbreviated horse name tags.
 * Designed to fit entirely in the viewport with no scrolling.
 * Tap any cell to reveal a detail overlay with full entry info.
 */

import React, { useMemo, useState, useCallback } from "react";
import { X, CalendarX2 } from "lucide-react";
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

function minutesToShortLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "p" : "a";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")}${ampm}`;
}

function horseIndexToColor(index: number): string {
  const hue = (index * 137.5) % 360;
  return `hsl(${hue}, 60%, 38%)`;
}

/** Abbreviate a horse name to fit in a tiny cell. */
function abbrevHorse(name: string): string {
  // If name fits in ~6 chars use it; otherwise use first word truncated
  if (name.length <= 6) return name;
  const words = name.split(/\s+/);
  if (words.length === 1) return name.slice(0, 6);
  // Use first word up to 6 chars
  return words[0].slice(0, 6);
}

const SLOT_INTERVAL = 30;
const UNSCHEDULED = "unscheduled";

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  active: "In Progress",
  upcoming: "Upcoming",
  inactive: "Inactive",
};

const STATUS_COLORS: Record<string, string> = {
  completed: "#4F6D4F",
  active: "#B18A5D",
  upcoming: "#7CA17C",
  inactive: "#9CA3AF",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RingEntry {
  entry: ScheduleEntry;
  cls: ScheduleClass;
  event: ScheduleEvent;
  minuteOfDay: number | null;
}

interface SelectedDetail {
  entry: ScheduleEntry;
  cls: ScheduleClass;
  event: ScheduleEvent;
  minuteOfDay: number | null;
  color: string;
}

// ---------------------------------------------------------------------------
// Filter helper
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Detail overlay
// ---------------------------------------------------------------------------

function DetailOverlay({
  detail,
  onClose,
}: {
  detail: SelectedDetail;
  onClose: () => void;
}): React.ReactElement {
  const { entry, cls, minuteOfDay, color } = detail;
  const horseName = entry.horse?.name ?? "Unknown";
  const riderName = entry.rider?.name ?? null;
  const status = entryStatusKind(entry);
  const placing =
    entry.placing != null && entry.placing < 100000 ? entry.placing : null;
  const backNumber = entry.back_number ?? null;
  const className = cls.class_number
    ? `#${cls.class_number} ${cls.name}`
    : cls.name;
  const timeLabel =
    minuteOfDay != null ? minutesToTimeLabel(minuteOfDay) : "Unscheduled";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/50"
        style={{ animation: "fadeIn 0.15s ease-out forwards" }}
        onClick={onClose}
        aria-hidden
      />
      {/* Card */}
      <div
        className="fixed z-[81] left-4 right-4 top-1/2 -translate-y-1/2 bg-surface-card rounded-2xl shadow-lg border border-border-card overflow-hidden"
        style={{ animation: "scaleIn 0.18s ease-out forwards" }}
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${horseName}`}
      >
        {/* Color bar header */}
        <div
          className="h-1.5 w-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <div className="px-4 pt-3 pb-4">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <p className="font-heading text-base font-bold text-text-primary leading-tight truncate">
                {horseName}
              </p>
              {riderName && (
                <p className="font-body text-xs text-text-secondary mt-0.5 truncate">
                  Rider: {riderName}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-lg hover:bg-surface-card-alt transition-colors touch-manipulation"
              aria-label="Close details"
            >
              <X className="size-4 text-text-secondary" />
            </button>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="font-body text-[10px] font-medium text-text-secondary uppercase tracking-wide">
                Class
              </p>
              <p className="font-body text-xs text-text-primary mt-0.5 leading-snug">
                {className}
              </p>
            </div>
            <div>
              <p className="font-body text-[10px] font-medium text-text-secondary uppercase tracking-wide">
                Time
              </p>
              <p className="font-body text-xs text-text-primary mt-0.5">
                {timeLabel}
              </p>
            </div>
            <div>
              <p className="font-body text-[10px] font-medium text-text-secondary uppercase tracking-wide">
                Status
              </p>
              <span
                className="inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                style={{ background: STATUS_COLORS[status] ?? "#9CA3AF" }}
              >
                {STATUS_LABELS[status] ?? status}
              </span>
            </div>
            {placing != null && (
              <div>
                <p className="font-body text-[10px] font-medium text-text-secondary uppercase tracking-wide">
                  Placing
                </p>
                <p className="font-body text-xs font-bold text-accent-green-dark mt-0.5">
                  #{placing}
                </p>
              </div>
            )}
            {backNumber && (
              <div>
                <p className="font-body text-[10px] font-medium text-text-secondary uppercase tracking-wide">
                  Back #
                </p>
                <p className="font-body text-xs text-text-primary mt-0.5">
                  {backNumber}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface MobileRingBoardProps {
  data: ScheduleViewData | null;
  filters: DashboardFilters;
}

export const MobileRingBoard: React.FC<MobileRingBoardProps> = ({
  data,
  filters,
}) => {
  const [selectedDetail, setSelectedDetail] = useState<SelectedDetail | null>(
    null
  );

  const { rings, timeSlots, entriesByCell, horseToColor } = useMemo(() => {
    if (!data?.events) {
      return {
        rings: [] as ScheduleEvent[],
        timeSlots: [] as Array<{ key: string; label: string; minuteStart: number | null }>,
        entriesByCell: new Map<string, RingEntry[]>(),
        horseToColor: new Map<string, string>(),
      };
    }

    const filtered = filterSchedule(data.events, filters);
    const allEntries: RingEntry[] = [];

    for (const ev of filtered) {
      for (const cls of ev.classes) {
        for (const entry of cls.entries) {
          const timeStr = entry.estimated_start ?? entry.actual_start;
          allEntries.push({ entry, cls, event: ev, minuteOfDay: toMinuteOfDay(timeStr) });
        }
      }
    }

    if (allEntries.length === 0) {
      return {
        rings: [],
        timeSlots: [],
        entriesByCell: new Map(),
        horseToColor: new Map(),
      };
    }

    const ringsSorted = [...filtered].sort(
      (a, b) => (a.ring_number ?? 0) - (b.ring_number ?? 0)
    );

    // Build entries-by-cell map (key: `${ringId}-${slotMinuteStart}`)
    const byCell = new Map<string, RingEntry[]>();
    const scheduledMins = new Set<number>();

    for (const re of allEntries) {
      const ringKey = re.event.id;
      if (re.minuteOfDay != null) {
        const slot =
          Math.floor(re.minuteOfDay / SLOT_INTERVAL) * SLOT_INTERVAL;
        scheduledMins.add(slot);
        const key = `${ringKey}-${slot}`;
        if (!byCell.has(key)) byCell.set(key, []);
        byCell.get(key)!.push(re);
      } else {
        const key = `${ringKey}-${UNSCHEDULED}`;
        if (!byCell.has(key)) byCell.set(key, []);
        byCell.get(key)!.push(re);
      }
    }

    // Sort entries within each cell by time
    for (const entries of byCell.values()) {
      entries.sort((a, b) => (a.minuteOfDay ?? 9999) - (b.minuteOfDay ?? 9999));
    }

    // Build sorted time slot list — only slots that have at least one entry
    const sortedMins = Array.from(scheduledMins).sort((a, b) => a - b);
    const slots: Array<{ key: string; label: string; minuteStart: number | null }> =
      sortedMins.map((m) => ({
        key: String(m),
        label: minutesToShortLabel(m),
        minuteStart: m,
      }));

    // Add unscheduled row only if any ring has unscheduled entries
    const hasUnscheduled = ringsSorted.some((r) =>
      byCell.has(`${r.id}-${UNSCHEDULED}`)
    );
    if (hasUnscheduled) {
      slots.push({ key: UNSCHEDULED, label: "N/A", minuteStart: null });
    }

    // Horse color map
    const horseIds = Array.from(
      new Set(allEntries.map((e) => e.entry.horse.id))
    ).sort();
    const colors = new Map<string, string>();
    horseIds.forEach((id, idx) => colors.set(id, horseIndexToColor(idx)));

    return {
      rings: ringsSorted,
      timeSlots: slots,
      entriesByCell: byCell,
      horseToColor: colors,
    };
  }, [data, filters]);

  const handleCellTap = useCallback(
    (re: RingEntry) => {
      setSelectedDetail({
        entry: re.entry,
        cls: re.cls,
        event: re.event,
        minuteOfDay: re.minuteOfDay,
        color: horseToColor.get(re.entry.horse.id) ?? "#6B6B6B",
      });
    },
    [horseToColor]
  );

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

  const numRings = rings.length;
  const numRows = timeSlots.length;

  // Grid template: first col is time label, rest are rings
  const gridCols = `36px repeat(${numRings}, 1fr)`;
  // Grid rows: header + data rows — all 1fr so they fill the container equally
  const gridRows = `auto repeat(${numRows}, 1fr)`;

  return (
    <>
      {/* The board fills exactly the available space between header and bottom tab bar */}
      <div
        className="w-full overflow-hidden"
        style={{
          height: "calc(100vh - 48px - 56px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div
          className="h-full w-full"
          style={{
            display: "grid",
            gridTemplateColumns: gridCols,
            gridTemplateRows: gridRows,
          }}
        >
          {/* ── Header row ── */}
          {/* Time corner */}
          <div className="flex items-center justify-center border-b border-r border-border-card bg-[#F0F5F0] px-0.5">
            <span className="font-body text-[9px] font-semibold text-accent-green-dark">
              Time
            </span>
          </div>
          {/* Ring headers */}
          {rings.map((ring) => (
            <div
              key={ring.id}
              className="flex flex-col items-center justify-center border-b border-l border-border-card bg-[#F0F5F0] px-0.5 py-1"
            >
              <span className="font-body text-[9px] font-bold text-accent-green-dark leading-tight text-center">
                R{ring.ring_number ?? "?"}
              </span>
            </div>
          ))}

          {/* ── Data rows ── */}
          {timeSlots.map((slot, rowIdx) => {
            const isLastRow = rowIdx === timeSlots.length - 1;
            const isUnscheduled = slot.key === UNSCHEDULED;
            return (
              <React.Fragment key={slot.key}>
                {/* Time label cell */}
                <div
                  className={`flex items-center justify-center border-r border-border-card/60 px-0.5 ${
                    !isLastRow ? "border-b" : ""
                  } ${isUnscheduled ? "bg-surface-card-alt/40" : ""}`}
                >
                  <span
                    className={`font-body leading-tight text-center tabular-nums ${
                      isUnscheduled
                        ? "text-[9px] text-text-secondary"
                        : "text-[9px] font-semibold text-accent-green-dark"
                    }`}
                    style={{ fontSize: "8.5px" }}
                  >
                    {slot.label}
                  </span>
                </div>

                {/* Ring cells for this time slot */}
                {rings.map((ring) => {
                  const cellKey = `${ring.id}-${slot.key}`;
                  const cellEntries = entriesByCell.get(cellKey) ?? [];

                  return (
                    <div
                      key={ring.id}
                      className={`border-l border-border-card/60 overflow-hidden ${
                        !isLastRow ? "border-b" : ""
                      } ${isUnscheduled ? "bg-surface-card-alt/40" : ""}`}
                    >
                      {cellEntries.length === 0 ? null : (
                        <div className="h-full flex flex-col gap-px p-px">
                          {cellEntries.map((re: RingEntry) => {
                            const color =
                              horseToColor.get(re.entry.horse.id) ?? "#6B6B6B";
                            const abbrev = abbrevHorse(
                              re.entry.horse?.name ?? "?"
                            );
                            return (
                              <button
                                key={re.entry.id}
                                type="button"
                                onClick={() => handleCellTap(re)}
                                className="flex-1 min-h-0 flex items-center justify-center rounded-sm touch-manipulation active:opacity-80 transition-opacity overflow-hidden"
                                style={{ backgroundColor: color }}
                                aria-label={`${re.entry.horse?.name ?? "Horse"} in Ring ${ring.ring_number} — tap for details`}
                              >
                                <span
                                  className="font-body font-semibold text-white leading-none truncate px-0.5 select-none"
                                  style={{ fontSize: "8px" }}
                                >
                                  {abbrev}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Hint label at the very bottom, above tab bar */}
      <p
        className="text-center font-body text-text-secondary py-1"
        style={{ fontSize: "9px" }}
        aria-hidden
      >
        Tap any cell for details
      </p>

      {/* Detail overlay */}
      {selectedDetail && (
        <DetailOverlay
          detail={selectedDetail}
          onClose={() => setSelectedDetail(null)}
        />
      )}
    </>
  );
};
