import React, { useMemo, useState } from "react";
import {
  CalendarX2,
  PawPrint,
  BookOpen,
  Trophy,
  Activity,
  DollarSign,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type {
  ScheduleViewData,
  ScheduleEntry,
  ScheduleClass,
} from "../../api";
import type { DashboardFilters } from "../FilterBar";
import { entryStatusKind } from "../../utils/entryStatus";

const STATUS_COLORS: Record<string, string> = {
  completed: "#4F6D4F",
  active: "#B18A5D",
  upcoming: "#9CA3AF",
  inactive: "#D1D5DB",
};

interface MobileOverviewTabProps {
  data: ScheduleViewData | null;
  filters: DashboardFilters;
}

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

/* ------------------------------------------------------------------ */
/* Collapsible section wrapper                                        */
/* ------------------------------------------------------------------ */

function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border-card bg-surface-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3.5 py-3 text-left touch-manipulation active:bg-surface-card-alt/50"
      >
        <span className="text-text-secondary shrink-0">
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>
        <span className="font-heading text-sm font-semibold text-accent-green-dark flex-1 min-w-0 truncate">
          {title}
        </span>
        {count != null && (
          <span className="text-xs text-text-secondary font-body tabular-nums shrink-0">
            {count}
          </span>
        )}
      </button>
      {open && <div className="border-t border-border-card">{children}</div>}
    </div>
  );
}

export const MobileOverviewTab: React.FC<MobileOverviewTabProps> = ({
  data,
  filters,
}) => {
  const allEntries = useMemo<
    Array<{ entry: ScheduleEntry; cls: ScheduleClass }>
  >(() => {
    if (!data?.events) return [];
    const result: Array<{ entry: ScheduleEntry; cls: ScheduleClass }> = [];
    for (const ev of data.events) {
      for (const cls of ev.classes) {
        if (
          filters.className &&
          cls.name.toLowerCase() !== filters.className.toLowerCase()
        )
          continue;
        for (const entry of cls.entries) {
          if (
            filters.horseName &&
            (entry.horse?.name ?? "").toLowerCase() !==
              filters.horseName.toLowerCase()
          )
            continue;
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
  }, [data, filters]);

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

  /* Class progress data */
  const classProgressData = useMemo(() => {
    const byClass = new Map<
      string,
      { name: string; classNumber: string | null; completed: number; total: number }
    >();
    for (const { entry, cls } of allEntries) {
      if (!byClass.has(cls.id)) {
        byClass.set(cls.id, {
          name: cls.name,
          classNumber: cls.class_number ?? null,
          completed: 0,
          total: 0,
        });
      }
      const rec = byClass.get(cls.id)!;
      if (entry.total_trips != null) rec.total = entry.total_trips;
      if (entry.completed_trips != null)
        rec.completed = Math.max(rec.completed, entry.completed_trips);
    }
    return Array.from(byClass.values()).map((rec) => {
      const safeTotal =
        rec.total > 0
          ? rec.total
          : allEntries.filter((x) => x.cls.name === rec.name).length;
      const safeCompleted = Math.min(rec.completed, safeTotal);
      return { ...rec, completed: safeCompleted, total: safeTotal };
    });
  }, [allEntries]);

  /* Horse results grouped by horse name */
  interface HorseResultEntry {
    fullClassName: string;
    bestScore: number | null;
    placing: number | null;
    faults: number | null;
    prizeMoney: number | null;
    status: string;
  }
  interface HorseResultGroup {
    horseName: string;
    entries: HorseResultEntry[];
  }

  const horseResultGroups = useMemo<HorseResultGroup[]>(() => {
    const groups = new Map<string, HorseResultEntry[]>();
    for (const { entry, cls } of allEntries) {
      const horseName = entry.horse?.name ?? "Unknown";
      if (!groups.has(horseName)) groups.set(horseName, []);

      const scores = [
        entry.score1, entry.score2, entry.score3,
        entry.score4, entry.score5, entry.score6,
      ]
        .filter((s): s is string => s != null && s !== "")
        .map(Number)
        .filter((n) => !isNaN(n) && n > 0);
      const bestScore = scores.length > 0 ? Math.max(...scores) : null;
      const faults = entry.faults_one != null ? Number(entry.faults_one) : null;
      const prizeMoneyRaw = entry.total_prize_money;
      const prizeMoney =
        prizeMoneyRaw != null && prizeMoneyRaw !== ""
          ? (() => {
              const n = Number.parseFloat(
                String(prizeMoneyRaw).replace(/,/g, "")
              );
              return !Number.isNaN(n) ? n : null;
            })()
          : null;

      groups.get(horseName)!.push({
        fullClassName: cls.class_number
          ? `#${cls.class_number} ${cls.name}`
          : cls.name,
        bestScore,
        placing:
          entry.placing != null && entry.placing < 100000
            ? entry.placing
            : null,
        faults: faults != null && !isNaN(faults) ? faults : null,
        prizeMoney,
        status: entryStatusKind(entry),
      });
    }
    return Array.from(groups.entries()).map(([horseName, entries]) => ({
      horseName,
      entries,
    }));
  }, [allEntries]);

  /* Timeline data: grouped by time slot */
  const timelineSlots = useMemo(() => {
    const slots = new Map<
      number,
      Array<{
        horseName: string;
        className: string;
        status: string;
        timeLabel: string;
      }>
    >();
    for (const { entry, cls } of allEntries) {
      const timeStr = entry.estimated_start || entry.actual_start;
      const mins = toMinuteOfDay(timeStr);
      if (mins == null) continue;
      if (!slots.has(mins)) slots.set(mins, []);
      slots.get(mins)!.push({
        horseName: entry.horse?.name ?? "Unknown",
        className: cls.class_number
          ? `#${cls.class_number} ${cls.name.slice(0, 20)}`
          : cls.name.slice(0, 24),
        status: entryStatusKind(entry),
        timeLabel: minutesToTimeLabel(mins),
      });
    }
    return Array.from(slots.entries())
      .sort(([a], [b]) => a - b)
      .map(([mins, entries]) => ({
        minuteOfDay: mins,
        label: minutesToTimeLabel(mins),
        entries,
      }));
  }, [allEntries]);

  /* Expanded horse result group (by horse name) */
  const [expandedHorse, setExpandedHorse] = useState<string | null>(null);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <CalendarX2 className="size-10 text-border-card mb-3" aria-hidden />
        <p className="font-body text-sm text-text-secondary">
          No schedule for this date.
        </p>
      </div>
    );
  }

  const stats = [
    { icon: <PawPrint className="size-3.5" />, value: totalHorses, label: "Horses" },
    { icon: <BookOpen className="size-3.5" />, value: totalClasses, label: "Classes" },
    { icon: <Trophy className="size-3.5" />, value: completedEntries, label: "Done" },
    { icon: <Activity className="size-3.5" />, value: activeEntries, label: "Active" },
    {
      icon: <DollarSign className="size-3.5" />,
      value:
        totalPrizeMoneyToday > 0
          ? `$${totalPrizeMoneyToday.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
          : "$0",
      label: "Prize",
    },
  ];

  return (
    <div className="space-y-3 pb-2">
      {/* KPI Strip */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-3 px-3 py-1">
        {stats.map((s, i) => (
          <div
            key={i}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border border-border-card bg-surface-card shadow-card"
          >
            <span className="text-accent-green-dark">{s.icon}</span>
            <span className="font-heading text-sm font-bold text-text-primary tabular-nums">
              {s.value}
            </span>
            <span className="text-[10px] text-text-secondary font-body uppercase tracking-wide">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Class Progress */}
      {classProgressData.length > 0 && (
        <CollapsibleSection
          title="Class Progress"
          count={classProgressData.length}
        >
          <div className="px-3.5 py-3 space-y-2.5">
            {classProgressData.map((cls, i) => {
              const pct =
                cls.total > 0
                  ? Math.round((cls.completed / cls.total) * 100)
                  : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-body text-xs text-text-primary truncate max-w-[70%]">
                      {cls.classNumber ? `#${cls.classNumber} ${cls.name}` : cls.name}
                    </span>
                    <span className="font-body text-[10px] text-text-secondary tabular-nums">
                      {cls.completed}/{cls.total}
                    </span>
                  </div>
                  <div className="h-2 bg-border-card rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-green rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Horse Results — grouped by horse */}
      {horseResultGroups.length > 0 && (
        <CollapsibleSection title="Horse Results" count={horseResultGroups.length}>
          <div className="divide-y divide-border-card/60">
            {horseResultGroups.map((group) => {
              const isExpanded = expandedHorse === group.horseName;
              const entryCount = group.entries.length;
              return (
                <div key={group.horseName}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedHorse(isExpanded ? null : group.horseName)
                    }
                    className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left touch-manipulation active:bg-surface-card-alt/50"
                  >
                    <span className="shrink-0 w-5 h-5 rounded-full bg-accent-green/10 flex items-center justify-center">
                      <PawPrint className="size-3 text-accent-green-dark" />
                    </span>
                    <span className="font-body text-sm font-medium text-text-primary truncate flex-1 min-w-0">
                      {group.horseName}
                    </span>
                    <span className="font-body text-[10px] text-text-secondary bg-background-primary border border-border-card rounded-full px-1.5 py-0.5 tabular-nums shrink-0">
                      {entryCount} {entryCount === 1 ? "class" : "classes"}
                    </span>
                    <span className="text-text-secondary shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="size-3.5" />
                      ) : (
                        <ChevronRight className="size-3.5" />
                      )}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-3.5 pb-3 pt-1 space-y-2">
                      {group.entries.map((entry, ei) => (
                        <div
                          key={ei}
                          className="rounded-lg bg-background-primary border border-border-card/60 p-2.5"
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span
                              className="shrink-0 w-2 h-2 rounded-full"
                              style={{
                                background:
                                  STATUS_COLORS[entry.status] ?? "#9CA3AF",
                              }}
                            />
                            <span className="font-body text-xs font-medium text-text-primary truncate">
                              {entry.fullClassName}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs font-body">
                            <span className="text-text-secondary">Placing</span>
                            <span className="text-accent-green-dark font-medium text-right tabular-nums">
                              {entry.placing != null ? `#${entry.placing}` : "—"}
                            </span>
                            <span className="text-text-secondary">Best Score</span>
                            <span className="text-text-primary text-right tabular-nums">
                              {entry.bestScore != null
                                ? entry.bestScore.toFixed(2)
                                : "—"}
                            </span>
                            <span className="text-text-secondary">Faults</span>
                            <span className="text-text-primary text-right tabular-nums">
                              {entry.faults != null
                                ? entry.faults.toFixed(2)
                                : "—"}
                            </span>
                            <span className="text-text-secondary">Prize Money</span>
                            <span className="text-text-primary text-right tabular-nums">
                              {entry.prizeMoney != null
                                ? `$${entry.prizeMoney.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}`
                                : "—"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Day Timeline */}
      {timelineSlots.length > 0 && (
        <CollapsibleSection title="Day Timeline" count={timelineSlots.length}>
          <div className="px-3.5 py-3 space-y-0">
            {timelineSlots.map((slot, si) => (
              <div key={si} className="flex gap-3">
                {/* Time column */}
                <div className="w-16 shrink-0 pt-0.5 text-right">
                  <span className="font-body text-[11px] font-medium text-text-secondary tabular-nums">
                    {slot.label}
                  </span>
                </div>
                {/* Vertical line + entries */}
                <div className="flex-1 min-w-0 border-l-2 border-border-card pl-3 pb-3">
                  <div className="space-y-1">
                    {slot.entries.map((e, ei) => (
                      <div
                        key={ei}
                        className="flex items-center gap-2 py-1"
                      >
                        <span
                          className="shrink-0 w-2 h-2 rounded-full"
                          style={{
                            background:
                              STATUS_COLORS[e.status] ?? "#9CA3AF",
                          }}
                        />
                        <span className="font-body text-xs font-medium text-text-primary truncate">
                          {e.horseName}
                        </span>
                        <span className="font-body text-[10px] text-text-secondary truncate">
                          {e.className}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Empty state */}
      {allEntries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarX2 className="size-10 text-border-card mb-3" aria-hidden />
          <p className="font-body text-sm text-text-secondary">
            No data for the current filter.
          </p>
        </div>
      )}
    </div>
  );
};
