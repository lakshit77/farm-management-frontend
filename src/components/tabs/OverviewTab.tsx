/**
 * Overview tab: show summary card, class progress bars (recharts),
 * horse results per class, and a timeline of the day's entries.
 * Data is passed in from DashboardView; no internal API calls.
 */

import React, { useMemo } from "react";
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
} from "lucide-react";
import type {
  ScheduleViewData,
  ScheduleEntry,
  ScheduleClass,
} from "../../api";
import type { DashboardFilters } from "../FilterBar";

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

interface HorseResultDatum {
  horseName: string;
  className: string;
  /** Best score across score1–score6, or null when none. */
  score: number | null;
  placing: number | null;
  faults: number | null;
  status: string;
}

interface TimelineDatum {
  /** Minutes since midnight — used for scatter X position. */
  minuteOfDay: number;
  horseName: string;
  className: string;
  timeLabel: string;
  status: "completed" | "active" | "upcoming" | "inactive";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive simple entry status for colour-coding. */
function entryStatusKind(
  entry: ScheduleEntry
): "completed" | "active" | "upcoming" | "inactive" {
  const s = (entry.status ?? "").toLowerCase();
  if (s === "inactive") return "inactive";
  const cs = (entry.class_status ?? entry.status ?? "").toLowerCase();
  if (cs.includes("completed") || entry.gone_in) return "completed";
  if (cs.includes("underway") || cs.includes("in progress")) return "active";
  return "upcoming";
}

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

const STATUS_COLORS: Record<string, string> = {
  completed: "#4F6D4F",
  active: "#B18A5D",
  upcoming: "#9CA3AF",
  inactive: "#D1D5DB",
};

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
    <div className="rounded-card border border-border-card bg-surface-card shadow-card px-5 py-4 flex items-center gap-4">
      <div className="shrink-0 w-10 h-10 rounded-full bg-accent-green/10 flex items-center justify-center text-accent-green-dark">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
          {label}
        </p>
        <p className="font-heading text-2xl font-bold text-text-primary truncate">
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
    <section className="rounded-card border border-border-card bg-surface-card shadow-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border-card">
        <h3 className="font-heading text-lg font-semibold text-accent-green-dark">
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Custom tooltip for timeline scatter chart
// ---------------------------------------------------------------------------

interface TimelineTooltipPayload {
  horseName: string;
  className: string;
  timeLabel: string;
  status: string;
}

function TimelineTooltip(
  props: TooltipProps<number, string> & { active?: boolean; payload?: Array<{ payload?: TimelineTooltipPayload }> }
): React.ReactElement | null {
  const { active, payload } = props;
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-card border border-border-card bg-surface-card shadow-card px-3 py-2 text-sm font-body max-w-xs">
      <p className="font-medium text-text-primary">{d.horseName}</p>
      <p className="text-text-secondary">{d.className}</p>
      <p className="text-text-secondary">{d.timeLabel}</p>
      <p className="capitalize text-text-secondary">{d.status}</p>
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
 * Overview tab with three visualisations:
 * 1. Summary stat cards (show name, total horses, classes, notifications).
 * 2. Class progress stacked bar chart (completed vs remaining trips).
 * 3. Horse results card (placing, best score, faults per class).
 * 4. Day timeline scatter chart (entries by start time, colour by status).
 */
export const OverviewTab: React.FC<OverviewTabProps> = ({ data, filters }) => {
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

  // Horse results data
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
      return {
        horseName: entry.horse?.name ?? "Unknown",
        className: cls.class_number ? `#${cls.class_number}` : cls.name.slice(0, 16),
        score: bestScore,
        placing:
          entry.placing != null && entry.placing < 100000
            ? entry.placing
            : null,
        faults: faults != null && !isNaN(faults) ? faults : null,
        status: entryStatusKind(entry),
      };
    });
  }, [allEntries]);

  // Timeline data
  const timelineData = useMemo<TimelineDatum[]>(() => {
    const items: TimelineDatum[] = [];
    for (const { entry, cls } of allEntries) {
      const timeStr = entry.estimated_start || entry.actual_start;
      const mins = toMinuteOfDay(timeStr);
      if (mins == null) continue;
      items.push({
        minuteOfDay: mins,
        horseName: entry.horse?.name ?? "Unknown",
        className: cls.class_number ? `#${cls.class_number} ${cls.name.slice(0, 20)}` : cls.name.slice(0, 24),
        timeLabel: minutesToTimeLabel(mins),
        status: entryStatusKind(entry),
      });
    }
    return items;
  }, [allEntries]);

  // Unique statuses present in timeline (for legend)
  const legendStatuses = useMemo(
    () =>
      (["completed", "active", "upcoming"] as const).filter((s) =>
        timelineData.some((d) => d.status === s)
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
    <div className="space-y-6">
      {/* ─── Summary stats ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      </div>

      {/* ─── Class progress ─── */}
      {classProgressData.length > 0 && (
        <Section title="Class Progress">
          <p className="font-body text-xs text-text-secondary mb-4">
            Trips completed vs remaining in each class
          </p>
          <div style={{ width: "100%", height: Math.max(200, classProgressData.length * 44) }}>
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
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-xs font-body text-text-secondary">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: PROGRESS_BAR_COLOR }} />
              Completed
            </span>
            <span className="flex items-center gap-1.5 text-xs font-body text-text-secondary">
              <span className="w-3 h-3 rounded-sm inline-block border border-border-card" style={{ background: PROGRESS_REMAINING_COLOR }} />
              Remaining
            </span>
          </div>
        </Section>
      )}

      {/* ─── Horse results ─── */}
      {horseResultsData.length > 0 && (
        <Section title="Horse Results">
          <div className="overflow-x-auto">
            <table className="w-full font-body text-sm border-collapse">
              <thead>
                <tr className="border-b border-border-card">
                  <th className="text-left py-2 pr-4 font-medium text-text-secondary">Horse</th>
                  <th className="text-left py-2 pr-4 font-medium text-text-secondary">Class</th>
                  <th className="text-center py-2 pr-4 font-medium text-text-secondary">Status</th>
                  <th className="text-center py-2 pr-4 font-medium text-text-secondary">Placing</th>
                  <th className="text-center py-2 pr-4 font-medium text-text-secondary">Best Score</th>
                  <th className="text-center py-2 font-medium text-text-secondary">Faults</th>
                </tr>
              </thead>
              <tbody>
                {horseResultsData.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border-card/50 hover:bg-surface-card-alt/50 transition-colors"
                  >
                    <td className="py-2.5 pr-4 font-medium text-text-primary">
                      {row.horseName}
                    </td>
                    <td className="py-2.5 pr-4 text-text-secondary">{row.className}</td>
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
                    <td className="py-2.5 text-center tabular-nums text-text-primary">
                      {row.faults != null ? row.faults.toFixed(2) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ─── Day timeline ─── */}
      {timelineData.length > 0 && (
        <Section title="Day Timeline">
          <p className="font-body text-xs text-text-secondary mb-4">
            Each dot represents a horse entry, positioned by estimated start time
          </p>
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 16, right: 24, left: -16, bottom: 0 }}>
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
                  dataKey={() => 1}
                  hide
                  domain={[0, 2]}
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
                    const color =
                      p ? (STATUS_COLORS[p.status] ?? "#9CA3AF") : "#9CA3AF";
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={7}
                        fill={color}
                        fillOpacity={0.85}
                        stroke="#fff"
                        strokeWidth={1.5}
                      />
                    );
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-3">
            {legendStatuses.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1.5 text-xs font-body text-text-secondary capitalize"
              >
                <span
                  className="w-3 h-3 rounded-full inline-block"
                  style={{ background: STATUS_COLORS[s] }}
                />
                {s}
              </span>
            ))}
            <span className="flex items-center gap-1.5 text-xs font-body text-text-secondary ml-auto">
              <Clock className="size-3.5" aria-hidden /> Estimated start time
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
