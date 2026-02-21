/**
 * Overview tab: show summary card, class progress bars (recharts),
 * horse results per class, and a timeline of the day's entries.
 * Data is passed in from DashboardView; no internal API calls.
 */

import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  CartesianGrid,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { ScatterShapeProps } from "recharts";
import {
  CalendarX2,
  PawPrint,
  BookOpen,
  Trophy,
  Activity,
  Clock,
  Filter,
  DollarSign,
} from "lucide-react";
import type {
  ScheduleViewData,
  ScheduleEntry,
  ScheduleClass,
} from "../../api";
import type { DashboardFilters } from "../FilterBar";
import { entryStatusKind } from "../../utils/entryStatus";

// ---------------------------------------------------------------------------
// Types for derived data
// ---------------------------------------------------------------------------

interface ClassProgressDatum {
  /** Short class label for the axis. */
  label: string;
  /** Full class name for the tooltip. */
  fullName: string;
  completed: number;
  remaining: number;
  total: number;
}

/** Max characters for class name display before truncation with "...". */
const HORSE_RESULT_CLASS_DISPLAY_LENGTH = 40;

interface HorseResultDatum {
  horseName: string;
  /** Truncated class label for display (fixed space + "..." when long). */
  className: string;
  /** Full class name for hover tooltip. */
  fullClassName: string;
  /** Best score across score1–score6, or null when none. */
  score: number | null;
  placing: number | null;
  faults: number | null;
  /** Total prize money for this entry, or null when none. */
  prizeMoney: number | null;
  status: string;
}

/** Horse results grouped by horse name for display. */
interface HorseResultGroup {
  horseName: string;
  results: HorseResultDatum[];
}

/** Timeline source filter: group by horse, rider, or both. */
export type TimelineSourceFilter = "horse" | "rider" | "both";

/** Single entry within a timeline point (for tooltip display). */
interface TimelineEntryItem {
  horseName: string;
  riderName: string | null;
  className: string;
  timeLabel: string;
  status: "completed" | "active" | "upcoming" | "inactive";
  isUnscheduled: boolean;
}

interface TimelineDatum {
  /** Minutes since midnight — used for scatter X position. */
  minuteOfDay: number;
  /** Y position (source row index, center of row). */
  y: number;
  sourceName: string;
  /** All entries at this point (1 or more when overlapping). */
  entries: TimelineEntryItem[];
  /** Number of overlapping entries; shown as badge when > 1. */
  count: number;
}

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

/** Derive source name from entry based on filter (horse, rider, or both). */
function getSourceName(
  entry: ScheduleEntry,
  filter: TimelineSourceFilter
): string {
  const horse = entry.horse?.name ?? "Unknown";
  const rider = entry.rider?.name ?? "Unknown";
  switch (filter) {
    case "horse":
      return horse;
    case "rider":
      return rider;
    case "both":
      return `${horse} / ${rider}`;
    default:
      return horse;
  }
}

const STATUS_COLORS: Record<string, string> = {
  completed: "#4F6D4F",
  active: "#B18A5D",
  upcoming: "#9CA3AF",
  inactive: "#D1D5DB",
};

/** Priority for dominant status when multiple entries overlap (higher = preferred). */
const STATUS_PRIORITY: Record<string, number> = {
  active: 3,
  completed: 2,
  upcoming: 1,
  inactive: 0,
};

/** Get dominant status color for a group of entries. */
function getDominantStatusColor(entries: TimelineEntryItem[]): string {
  if (entries.length === 0) return STATUS_COLORS.upcoming;
  const top = entries.reduce((a, b) =>
    (STATUS_PRIORITY[b.status] ?? 0) > (STATUS_PRIORITY[a.status] ?? 0) ? b : a
  );
  return STATUS_COLORS[top.status] ?? STATUS_COLORS.upcoming;
}

const PROGRESS_BAR_COLOR = "#4F6D4F";
const PROGRESS_REMAINING_COLOR = "#E8E8E8";

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="rounded-card border border-border-card bg-surface-card shadow-card px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 min-w-0">
      <div className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-accent-green/10 flex items-center justify-center text-accent-green-dark">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
          {label}
        </p>
        <p className="font-heading text-xl sm:text-2xl font-bold text-text-primary truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="rounded-card border border-border-card bg-surface-card shadow-card overflow-hidden min-w-0">
      <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-border-card">
        <h3 className="font-heading text-base sm:text-lg font-semibold text-accent-green-dark">
          {title}
        </h3>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Custom tooltip for timeline scatter chart
// ---------------------------------------------------------------------------

function TimelineTooltip(
  props: TooltipProps<number, string> & {
    active?: boolean;
    payload?: Array<{ payload?: TimelineDatum }>;
  }
): React.ReactElement | null {
  const { active, payload } = props;
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d || !d.entries?.length) return null;
  return (
    <div className="rounded-card border border-border-card bg-surface-card shadow-card px-3 py-2 text-sm font-body max-w-sm max-h-64 overflow-y-auto">
      <p className="font-medium text-text-primary mb-2">{d.sourceName}</p>
      {d.count > 1 && (
        <p className="text-xs text-text-secondary mb-2">
          {d.count} entries at this time
        </p>
      )}
      <div className="space-y-2">
        {d.entries.map((e, i) => (
          <div
            key={i}
            className="flex items-start gap-2 py-1.5 border-b border-border-card/50 last:border-0"
          >
            <span
              className="shrink-0 w-2.5 h-2.5 rounded-full mt-0.5"
              style={{ background: STATUS_COLORS[e.status] ?? "#9CA3AF" }}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-text-primary font-medium">{e.className}</p>
              <p className="text-text-secondary text-xs">
                {e.isUnscheduled ? "Unscheduled" : e.timeLabel} · {e.status}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface OverviewTabProps {
  /** Full schedule data for the selected date. */
  data: ScheduleViewData | null;
  /** Current dashboard filters. */
  filters: DashboardFilters;
}

/**
 * Overview tab with summary and visualisations:
 * 1. Summary stat cards (horses, classes, completed, in progress, prize money today).
 * 2. Class progress stacked bar chart (completed vs remaining trips).
 * 3. Horse results card (placing, best score, faults per class).
 * 4. Day timeline scatter chart (entries by start time, colour by status).
 */
export const OverviewTab: React.FC<OverviewTabProps> = ({ data, filters }) => {
  const [timelineSourceFilter, setTimelineSourceFilter] =
    useState<TimelineSourceFilter>("horse");

  // Flatten all active entries respecting filters
  const allEntries = useMemo<Array<{ entry: ScheduleEntry; cls: ScheduleClass }>>(
    () => {
      if (!data?.events) return [];
      const result: Array<{ entry: ScheduleEntry; cls: ScheduleClass }> = [];
      for (const ev of data.events) {
        for (const cls of ev.classes) {
          // Apply class filter
          if (
            filters.className &&
            cls.name.toLowerCase() !== filters.className.toLowerCase()
          )
            continue;
          for (const entry of cls.entries) {
            // Apply horse filter
            if (
              filters.horseName &&
              (entry.horse?.name ?? "").toLowerCase() !==
                filters.horseName.toLowerCase()
            )
              continue;
            // Apply status filter (not started / underway / completed)
            if (
              filters.statusFilter &&
              entryStatusKind(entry) !== filters.statusFilter
            )
              continue;
            result.push({ entry, cls });
          }
        }
      }
      return result;
    },
    [data, filters]
  );

  // Summary stats
  const totalHorses = useMemo(
    () => new Set(allEntries.map((x) => x.entry.horse?.name ?? "")).size,
    [allEntries]
  );
  const totalClasses = useMemo(
    () => new Set(allEntries.map((x) => x.cls.id)).size,
    [allEntries]
  );
  const completedEntries = useMemo(
    () =>
      allEntries.filter((x) => entryStatusKind(x.entry) === "completed")
        .length,
    [allEntries]
  );
  const activeEntries = useMemo(
    () =>
      allEntries.filter((x) => entryStatusKind(x.entry) === "active").length,
    [allEntries]
  );

  /** Total prize money earned today for the active (filtered) entries. */
  const totalPrizeMoneyToday = useMemo(() => {
    let sum = 0;
    for (const { entry } of allEntries) {
      const v = entry.total_prize_money;
      if (v != null && v !== "") {
        const n = Number.parseFloat(String(v).replace(/,/g, ""));
        if (!Number.isNaN(n)) sum += n;
      }
    }
    return sum;
  }, [allEntries]);

  // Class progress data
  const classProgressData = useMemo<ClassProgressDatum[]>(() => {
    const byClass = new Map<
      string,
      { cls: ScheduleClass; completed: number; total: number }
    >();
    for (const { entry, cls } of allEntries) {
      if (!byClass.has(cls.id)) {
        byClass.set(cls.id, { cls, completed: 0, total: 0 });
      }
      const rec = byClass.get(cls.id)!;
      if (entry.total_trips != null) rec.total = entry.total_trips;
      if (entry.completed_trips != null) rec.completed = Math.max(rec.completed, entry.completed_trips);
    }
    return Array.from(byClass.values()).map(({ cls, completed, total }) => {
      const safeTotal = total > 0 ? total : allEntries.filter(x => x.cls.id === cls.id).length;
      const safeCompleted = Math.min(completed, safeTotal);
      const remaining = Math.max(0, safeTotal - safeCompleted);
      const shortLabel =
        cls.class_number
          ? `#${cls.class_number}`
          : cls.name.slice(0, 12) + (cls.name.length > 12 ? "…" : "");
      return {
        label: shortLabel,
        fullName: cls.name,
        completed: safeCompleted,
        remaining,
        total: safeTotal,
      };
    });
  }, [allEntries]);

  // Horse results data: full class name + truncated display with "..."
  const horseResultsData = useMemo<HorseResultDatum[]>(() => {
    return allEntries.map(({ entry, cls }) => {
      const scores = [
        entry.score1,
        entry.score2,
        entry.score3,
        entry.score4,
        entry.score5,
        entry.score6,
      ]
        .filter((s): s is string => s != null && s !== "")
        .map(Number)
        .filter((n) => !isNaN(n) && n > 0);
      const bestScore =
        scores.length > 0 ? Math.max(...scores) : null;
      const faults = entry.faults_one != null ? Number(entry.faults_one) : null;
      const prizeMoneyRaw = entry.total_prize_money;
      const prizeMoney =
        prizeMoneyRaw != null && prizeMoneyRaw !== ""
          ? (() => {
              const n = Number.parseFloat(String(prizeMoneyRaw).replace(/,/g, ""));
              return !Number.isNaN(n) ? n : null;
            })()
          : null;
      const fullClassName =
        cls.class_number && cls.name
          ? `#${cls.class_number} ${cls.name}`
          : cls.class_number
            ? `#${cls.class_number}`
            : cls.name ?? "";
      const displayClassName =
        fullClassName.length > HORSE_RESULT_CLASS_DISPLAY_LENGTH
          ? `${fullClassName.slice(0, HORSE_RESULT_CLASS_DISPLAY_LENGTH)}...`
          : fullClassName;
      return {
        horseName: entry.horse?.name ?? "Unknown",
        className: displayClassName,
        fullClassName,
        score: bestScore,
        placing:
          entry.placing != null && entry.placing < 100000
            ? entry.placing
            : null,
        faults: faults != null && !isNaN(faults) ? faults : null,
        prizeMoney,
        status: entryStatusKind(entry),
      };
    });
  }, [allEntries]);

  // Horse results grouped by horse name (order preserved by first occurrence)
  const horseResultsByHorse = useMemo<HorseResultGroup[]>(() => {
    const groups = new Map<string, HorseResultDatum[]>();
    for (const row of horseResultsData) {
      const name = row.horseName;
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push(row);
    }
    return Array.from(groups.entries()).map(([horseName, results]) => ({
      horseName,
      results,
    }));
  }, [horseResultsData]);

  // Timeline: sources (rows) and data points
  const { timelineSources, timelineData } = useMemo(() => {
    const UNSCHEDULED = "Unscheduled";
    const rawItems: Array<{
      sourceName: string;
      minuteOfDay: number | null;
      entry: ScheduleEntry;
      cls: ScheduleClass;
    }> = [];
    for (const { entry, cls } of allEntries) {
      const sourceName = getSourceName(entry, timelineSourceFilter);
      const timeStr = entry.estimated_start || entry.actual_start;
      const mins = toMinuteOfDay(timeStr);
      rawItems.push({
        sourceName,
        minuteOfDay: mins ?? null,
        entry,
        cls,
      });
    }
    const sourceSet = new Set<string>();
    for (const r of rawItems) {
      sourceSet.add(r.sourceName);
    }
    const hasUnscheduled = rawItems.some((r) => r.minuteOfDay == null);
    if (hasUnscheduled) sourceSet.add(UNSCHEDULED);
    const sourcesSorted = Array.from(sourceSet).sort((a, b) => {
      if (a === UNSCHEDULED) return 1;
      if (b === UNSCHEDULED) return -1;
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
    const sourceToIndex = new Map(sourcesSorted.map((s, i) => [s, i]));

    const timeRange = { min: Infinity, max: -Infinity };
    for (const r of rawItems) {
      if (r.minuteOfDay != null) {
        timeRange.min = Math.min(timeRange.min, r.minuteOfDay);
        timeRange.max = Math.max(timeRange.max, r.minuteOfDay);
      }
    }
    const unscheduledX =
      timeRange.max > -Infinity ? timeRange.max + 60 : 12 * 60;

    const groups = new Map<
      string,
      Array<{ entry: ScheduleEntry; cls: ScheduleClass; sourceName: string; minuteOfDay: number | null }>
    >();
    for (const r of rawItems) {
      const sourceIndex = sourceToIndex.get(
        r.minuteOfDay == null ? UNSCHEDULED : r.sourceName
      )!;
      const x = r.minuteOfDay ?? unscheduledX;
      const key = `${sourceIndex}-${x}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({ entry: r.entry, cls: r.cls, sourceName: r.sourceName, minuteOfDay: r.minuteOfDay });
    }

    const items: TimelineDatum[] = [];
    for (const [key, groupEntries] of groups) {
      const [sourceIdxStr, xStr] = key.split("-");
      const sourceIndex = Number(sourceIdxStr);
      const x = Number(xStr);
      const y = sourceIndex + 0.5;
      const first = groupEntries[0]!;
      const sourceName = first.sourceName;

      const entries: TimelineEntryItem[] = groupEntries.map(({ entry, cls, minuteOfDay }) => ({
        horseName: entry.horse?.name ?? "Unknown",
        riderName: entry.rider?.name ?? null,
        className: cls.class_number
          ? `#${cls.class_number} ${cls.name.slice(0, 20)}`
          : cls.name.slice(0, 24),
        timeLabel:
          minuteOfDay != null ? minutesToTimeLabel(minuteOfDay) : "Unscheduled",
        status: entryStatusKind(entry),
        isUnscheduled: minuteOfDay == null,
      }));

      items.push({
        minuteOfDay: x,
        y,
        sourceName,
        entries,
        count: entries.length,
      });
    }
    return {
      timelineSources: sourcesSorted,
      timelineData: items,
    };
  }, [allEntries, timelineSourceFilter]);

  // Unique statuses present in timeline (for legend)
  const legendStatuses = useMemo(
    () =>
      (["completed", "active", "upcoming"] as const).filter((s) =>
        timelineData.some((d) => d.entries.some((e) => e.status === s))
      ),
    [timelineData]
  );

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CalendarX2 className="size-12 text-border-card mb-4" aria-hidden />
        <p className="font-body text-text-secondary">
          No schedule for this date.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* ─── Summary stats ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          icon={<PawPrint className="size-5" />}
          label="Horses"
          value={totalHorses}
        />
        <StatCard
          icon={<BookOpen className="size-5" />}
          label="Classes"
          value={totalClasses}
        />
        <StatCard
          icon={<Trophy className="size-5" />}
          label="Completed"
          value={completedEntries}
        />
        <StatCard
          icon={<Activity className="size-5" />}
          label="In progress"
          value={activeEntries}
        />
        <StatCard
          icon={<DollarSign className="size-5" />}
          label="Prize money today"
          value={
            totalPrizeMoneyToday > 0
              ? `$${totalPrizeMoneyToday.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "—"
          }
        />
      </div>

      {/* ─── Class progress ─── */}
      {classProgressData.length > 0 && (
        <Section title="Class Progress">
          <p className="font-body text-xs text-text-secondary mb-3 sm:mb-4">
            Trips completed vs remaining in each class
          </p>
          <div className="w-full min-h-[180px] sm:min-h-[200px]" style={{ height: Math.max(200, classProgressData.length * 44) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={classProgressData}
                margin={{ top: 0, right: 32, left: 8, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#E8E8E8"
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#6B6B6B", fontFamily: "Inter, sans-serif" }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, "dataMax"]}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={56}
                  tick={{ fontSize: 11, fill: "#6B6B6B", fontFamily: "Inter, sans-serif" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(79,109,79,0.06)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload as ClassProgressDatum;
                    return (
                      <div className="rounded-card border border-border-card bg-surface-card shadow-card px-3 py-2 text-sm font-body">
                        <p className="font-medium text-text-primary mb-1">{d.fullName}</p>
                        <p className="text-accent-green-dark">Completed: {d.completed}</p>
                        <p className="text-text-secondary">Remaining: {d.remaining}</p>
                        <p className="text-text-secondary">Total: {d.total}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="completed" stackId="a" fill={PROGRESS_BAR_COLOR} radius={[0, 0, 0, 0]} />
                <Bar dataKey="remaining" stackId="a" fill={PROGRESS_REMAINING_COLOR} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-xs font-body text-text-secondary">
              <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ background: PROGRESS_BAR_COLOR }} />
              Completed
            </span>
            <span className="flex items-center gap-1.5 text-xs font-body text-text-secondary">
              <span className="w-3 h-3 rounded-sm inline-block border border-border-card shrink-0" style={{ background: PROGRESS_REMAINING_COLOR }} />
              Remaining
            </span>
          </div>
        </Section>
      )}

      {/* ─── Horse results ─── */}
      {horseResultsByHorse.length > 0 && (
        <Section title="Horse Results">
          {/* Mobile: card per horse, with class rows grouped under horse name */}
          <div className="sm:hidden space-y-4">
            {horseResultsByHorse.map((group, gi) => (
              <div
                key={gi}
                className="rounded-lg border border-border-card bg-surface-card-alt/50 overflow-visible"
              >
                <div className="px-3 py-2 border-b border-border-card bg-surface-card/80 rounded-t-lg">
                  <span className="font-medium text-text-primary truncate block">{group.horseName}</span>
                </div>
                <div className="p-3 space-y-3">
                  {group.results.map((row, ri) => (
                    <div key={ri} className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-body">
                      <span className="text-text-secondary">Class</span>
                      <div className="group/class relative text-right flex items-center justify-end gap-1.5">
                        <span className="text-text-primary inline-block max-w-[18ch] truncate cursor-help outline-none" tabIndex={0}>
                          {row.className}
                        </span>
                        <span className="shrink-0 w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[row.status] ?? "#9CA3AF" }} title={row.status} aria-hidden />
                        {row.fullClassName && (
                          <div
                            className="absolute right-0 left-auto top-full mt-1 w-[min(280px,calc(100vw-2rem))] sm:left-auto sm:right-0 sm:top-auto sm:bottom-full sm:mb-1 sm:mt-0 sm:w-auto sm:max-w-[240px] hidden group-hover/class:block group-focus-within/class:block z-50 px-2 py-1.5 rounded-md border border-border-card bg-surface-card shadow-card text-xs font-body text-text-primary whitespace-normal pointer-events-none"
                            role="tooltip"
                          >
                            {row.fullClassName}
                          </div>
                        )}
                      </div>
                      <span className="text-text-secondary">Placing</span>
                      <span className="text-accent-green-dark font-medium tabular-nums text-right">{row.placing != null ? `#${row.placing}` : "—"}</span>
                      <span className="text-text-secondary">Best Score</span>
                      <span className="text-text-primary tabular-nums text-right">{row.score != null ? row.score.toFixed(2) : "—"}</span>
                      <span className="text-text-secondary">Faults</span>
                      <span className="text-text-primary tabular-nums text-right">{row.faults != null ? row.faults.toFixed(2) : "—"}</span>
                      <span className="text-text-secondary">Prize money</span>
                      <span className="text-text-primary tabular-nums text-right">
                        {row.prizeMoney != null ? `$${row.prizeMoney.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Desktop: table grouped by horse (horse name rowSpan per group) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full font-body text-sm border-collapse">
              <thead>
                <tr className="border-b border-border-card">
                  <th className="text-left py-2 pr-4 font-medium text-text-secondary">Horse</th>
                  <th className="text-left py-2 pr-4 font-medium text-text-secondary">Class</th>
                  <th className="text-center py-2 pr-4 font-medium text-text-secondary">Status</th>
                  <th className="text-center py-2 pr-4 font-medium text-text-secondary">Placing</th>
                  <th className="text-center py-2 pr-4 font-medium text-text-secondary">Best Score</th>
                  <th className="text-center py-2 pr-4 font-medium text-text-secondary">Faults</th>
                  <th className="text-center py-2 font-medium text-text-secondary">Prize money</th>
                </tr>
              </thead>
              <tbody>
                {horseResultsByHorse.map((group, gi) =>
                  group.results.map((row, ri) => (
                    <tr
                      key={`${gi}-${ri}`}
                      className="border-b border-border-card/50 hover:bg-surface-card-alt/50 transition-colors"
                    >
                      {ri === 0 ? (
                        <td
                          rowSpan={group.results.length}
                          className="py-2.5 pr-4 font-medium text-text-primary align-middle border-r border-border-card/50"
                        >
                          {group.horseName}
                        </td>
                      ) : null}
                      <td className="py-2.5 pr-4 text-text-secondary min-w-[8rem] max-w-[14rem] align-top">
                        <div className="group/class relative inline-block max-w-full">
                          <span className="inline-block max-w-full truncate align-bottom cursor-help">
                            {row.className}
                          </span>
                          {row.fullClassName && (
                            <div
                              className="absolute left-0 bottom-full mb-1 hidden group-hover/class:block z-50 px-2 py-1.5 rounded-md border border-border-card bg-surface-card shadow-card text-xs font-body text-text-primary whitespace-normal max-w-[280px] pointer-events-none"
                              role="tooltip"
                            >
                              {row.fullClassName}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-center">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ background: STATUS_COLORS[row.status] ?? "#9CA3AF" }}
                          title={row.status}
                        />
                      </td>
                      <td className="py-2.5 pr-4 text-center font-medium text-accent-green-dark tabular-nums">
                        {row.placing != null ? `#${row.placing}` : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-center tabular-nums text-text-primary">
                        {row.score != null ? row.score.toFixed(2) : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-center tabular-nums text-text-primary">
                        {row.faults != null ? row.faults.toFixed(2) : "—"}
                      </td>
                      <td className="py-2.5 text-center tabular-nums text-text-primary">
                        {row.prizeMoney != null ? `$${row.prizeMoney.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ─── Day timeline ─── */}
      {timelineData.length > 0 && (
        <Section title="Day Timeline">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 mb-4">
            <p className="font-body text-xs text-text-secondary order-2 sm:order-1">
              Each row is a participant; dots show when they compete
            </p>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <Filter className="size-3.5 text-text-secondary shrink-0" aria-hidden />
              <span className="text-xs font-medium text-text-secondary shrink-0">Group by:</span>
              <div className="flex rounded-md border border-border-card overflow-hidden">
                {(["horse", "rider", "both"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setTimelineSourceFilter(opt)}
                    className={`px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-medium transition-colors touch-manipulation ${
                      timelineSourceFilter === opt
                        ? "bg-accent-green text-white"
                        : "bg-surface-card text-text-secondary hover:bg-surface-card-alt"
                    }`}
                  >
                    {opt === "both" ? "Horse + Rider" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div
            className="w-full min-h-[200px]"
            style={{
              height: Math.max(200, timelineSources.length * 36 + 60),
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 24, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                <XAxis
                  type="number"
                  dataKey="minuteOfDay"
                  domain={["dataMin - 10", "dataMax + 10"]}
                  tickFormatter={minutesToTimeLabel}
                  tick={{ fontSize: 10, fill: "#6B6B6B", fontFamily: "Inter, sans-serif" }}
                  tickLine={false}
                  axisLine={false}
                  name="Time"
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[timelineSources.length, 0]}
                  width={120}
                  ticks={timelineSources.map((_, i) => i + 0.5)}
                  tickFormatter={(val: number) => {
                    const name = timelineSources[Math.floor(val)] ?? "";
                    return name.length > 22 ? name.slice(0, 20) + "…" : name;
                  }}
                  tick={{ fontSize: 10, fill: "#6B6B6B", fontFamily: "Inter, sans-serif" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={<TimelineTooltip />}
                />
                <Scatter
                  data={timelineData}
                  shape={(props: ScatterShapeProps) => {
                    const { cx = 0, cy = 0 } = props;
                    const p = (props as ScatterShapeProps & { payload?: TimelineDatum }).payload;
                    const color = p ? getDominantStatusColor(p.entries) : "#9CA3AF";
                    const count = p?.count ?? 1;
                    const showBadge = count > 1;
                    const r = showBadge ? 8 : 6;
                    return (
                      <g>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={r}
                          fill={color}
                          fillOpacity={0.85}
                          stroke="#fff"
                          strokeWidth={1.5}
                        />
                        {showBadge && (
                          <text
                            x={cx}
                            y={cy}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#fff"
                            fontSize={9}
                            fontWeight="bold"
                            style={{ fontFamily: "Inter, sans-serif" }}
                          >
                            {count}
                          </text>
                        )}
                      </g>
                    );
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3">
            {legendStatuses.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1.5 text-xs font-body text-text-secondary capitalize"
              >
                <span
                  className="w-3 h-3 rounded-full inline-block shrink-0"
                  style={{ background: STATUS_COLORS[s] }}
                />
                {s}
              </span>
            ))}
            <span className="flex items-center gap-1.5 text-xs font-body text-text-secondary sm:ml-auto">
              <Clock className="size-3.5 shrink-0" aria-hidden /> Estimated start time
            </span>
          </div>
        </Section>
      )}

      {/* Empty state when filters yield nothing */}
      {allEntries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarX2 className="size-12 text-border-card mb-4" aria-hidden />
          <p className="font-body text-text-secondary">
            No data to display for the current filter.
          </p>
        </div>
      )}
    </div>
  );
};
