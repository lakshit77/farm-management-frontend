import React, { useState, useCallback, useEffect } from "react";
import {
  Calendar,
  CalendarDays,
  CalendarX2,
  RefreshCw,
  Loader2,
  Filter,
  X,
  Search,
  User,
  ListFilter,
  ChevronDown,
  ChevronRight,
  BookOpen,
  PawPrint,
  Clock,
  Award,
  Hash,
  ListOrdered,
  AlertCircle,
  SearchX,
} from "lucide-react";
import { Header, Button, Input, Badge } from "./components";
import {
  SCHEDULE_VIEW_API,
  getApiHeaders,
  type ScheduleViewData,
  type ScheduleEvent,
  type ScheduleClass,
  type ScheduleEntry,
} from "./api";

/** Returns today's date as YYYY-MM-DD. */
function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Order of go label. */
function orderLabel(entry: ScheduleEntry): string {
  if (entry.order_of_go != null && entry.order_total != null) {
    return `${entry.order_of_go} of ${entry.order_total}`;
  }
  if (entry.order_of_go != null) return String(entry.order_of_go);
  return "—";
}

/** Derive a simple status for the row: completed, underway, or upcoming. */
function entryStatusLabel(entry: ScheduleEntry): "completed" | "active" | "upcoming" {
  const s = (entry.class_status ?? entry.status ?? "").toLowerCase();
  if (s.includes("completed") || entry.gone_in) return "completed";
  if (s.includes("underway") || s.includes("in progress")) return "active";
  return "upcoming";
}

/** Status filter value. */
type StatusFilterValue = "all" | "completed" | "active" | "upcoming";

/** Filter schedule events/classes/entries by horse, rider, status, and class type. */
function filterSchedule(
  events: ScheduleEvent[],
  filters: {
    horseName: string;
    riderName: string;
    status: StatusFilterValue;
    classType: string;
  }
): ScheduleEvent[] {
  const horse = (filters.horseName ?? "").trim().toLowerCase();
  const rider = (filters.riderName ?? "").trim().toLowerCase();
  const status = filters.status;
  const classType = (filters.classType ?? "").trim().toLowerCase();

  return events
    .map((ev) => ({
      ...ev,
      classes: ev.classes
        .filter(
          (cls) =>
            !classType || (cls.class_type ?? "").toLowerCase() === classType
        )
        .map((cls) => ({
          ...cls,
          entries: cls.entries.filter((entry) => {
            const entryHorse = (entry.horse?.name ?? "").toLowerCase();
            const entryRider = (entry.rider?.name ?? "").toLowerCase();
            const statusKind = entryStatusLabel(entry);
            if (horse && !entryHorse.includes(horse)) return false;
            if (rider && !entryRider.includes(rider)) return false;
            if (status !== "all" && statusKind !== status) return false;
            return true;
          }),
        }))
        .filter((cls) => cls.entries.length > 0),
    }))
    .filter((ev) => ev.classes.length > 0);
}

/** Collect unique class types from schedule data. */
function getUniqueClassTypes(events: ScheduleEvent[]): string[] {
  const set = new Set<string>();
  events.forEach((ev) =>
    ev.classes.forEach((cls) => {
      if (cls.class_type?.trim()) set.add(cls.class_type.trim());
    })
  );
  return Array.from(set).sort();
}

/** Definition row helper for consistent label/value styling. */
function DetailRow({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border-card/50 last:border-b-0">
      <span className="text-text-secondary text-sm font-body shrink-0">{label}</span>
      <span className="text-text-primary text-sm font-body text-right tabular-nums">{value}</span>
    </div>
  );
}

/** Expandable entry panel with clear section separation and visual hierarchy. */
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

  const hasFullDetails =
    entry.total_trips != null ||
    entry.points_earned != null ||
    entry.faults_one != null ||
    entry.faults_two != null ||
    [entry.score1, entry.score2, entry.score3, entry.score4, entry.score5, entry.score6].some(
      (v) => v != null
    );

  const scores = [entry.score1, entry.score2, entry.score3, entry.score4, entry.score5, entry.score6].filter(
    (s): s is string => s != null && s !== ""
  );

  return (
    <div className="px-5 py-4 bg-surface-card-alt/60 border-t border-border-card">
      {/* Section 1: Who & what — clear cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border border-border-card bg-surface-card px-3 py-2.5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1 flex items-center gap-1.5">
            <BookOpen className="size-3.5" aria-hidden /> Class
          </p>
          <p className="text-sm font-body text-text-primary">
            {cls.class_number && `${cls.class_number} · `}
            {cls.name}
            {cls.class_type && (
              <span className="text-text-secondary font-normal"> · {cls.class_type}</span>
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
              <span className="text-text-secondary font-normal"> · Back #{entry.back_number}</span>
            )}
          </p>
        </div>
        <div className="rounded-lg border border-border-card bg-surface-card px-3 py-2.5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1 flex items-center gap-1.5">
            <User className="size-3.5" aria-hidden /> Rider
          </p>
          <p className="text-sm font-body text-text-primary">{rider.name || "—"}</p>
        </div>
      </div>

      {/* Section 2: Status & times — single block with divider */}
      <div className="rounded-lg border border-border-card bg-surface-card px-3 py-2.5 mb-4">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Clock className="size-3.5" aria-hidden /> Status & times
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm font-body">
          {entry.class_status != null && (
            <span className="text-text-primary">{entry.class_status}</span>
          )}
          {entry.estimated_start != null && (
            <span className="text-text-secondary">Est. {entry.estimated_start}</span>
          )}
          {entry.actual_start != null && entry.actual_start !== "00:00:00" && (
            <span className="text-text-secondary">Actual {entry.actual_start}</span>
          )}
          {entry.placing != null && entry.placing < 100000 && (
            <span className="font-medium text-accent-green-dark">Placing {entry.placing}</span>
          )}
        </div>
      </div>

      {/* Section 3: Full details — collapsible, grouped */}
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
              {(entry.total_trips != null || entry.completed_trips != null || entry.remaining_trips != null) && (
                <div className="rounded-lg border border-border-card bg-surface-card px-3 py-2.5">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <ListOrdered className="size-3.5" aria-hidden /> Progress
                  </p>
                  <div className="space-y-0">
                    {entry.total_trips != null && <DetailRow label="Total trips" value={entry.total_trips} />}
                    {entry.completed_trips != null && <DetailRow label="Completed" value={entry.completed_trips} />}
                    {entry.remaining_trips != null && <DetailRow label="Remaining" value={entry.remaining_trips} />}
                  </div>
                </div>
              )}

              {/* Results (points, prize) */}
              {(entry.points_earned != null || entry.total_prize_money != null) && (
                <div className="rounded-lg border border-border-card bg-surface-card px-3 py-2.5">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Award className="size-3.5" aria-hidden /> Results
                  </p>
                  <div className="space-y-0">
                    {entry.points_earned != null && <DetailRow label="Points earned" value={entry.points_earned} />}
                    {entry.total_prize_money != null && <DetailRow label="Prize money" value={entry.total_prize_money} />}
                  </div>
                </div>
              )}

              {/* Rounds (faults, time) — side by side if both present */}
              {(entry.faults_one != null || entry.time_one != null || entry.faults_two != null || entry.time_two != null) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(entry.faults_one != null || entry.time_one != null) && (
                    <div className="rounded-lg border border-border-card bg-surface-card px-3 py-2.5">
                      <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Hash className="size-3.5" aria-hidden /> Round 1
                      </p>
                      <div className="space-y-0">
                        {entry.faults_one != null && <DetailRow label="Faults" value={entry.faults_one} />}
                        {entry.time_one != null && <DetailRow label="Time" value={entry.time_one} />}
                        {entry.disqualify_status_one != null && (
                          <DetailRow label="Disqualify" value={entry.disqualify_status_one} />
                        )}
                      </div>
                    </div>
                  )}
                  {(entry.faults_two != null || entry.time_two != null) && (
                    <div className="rounded-lg border border-border-card bg-surface-card px-3 py-2.5">
                      <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Hash className="size-3.5" aria-hidden /> Round 2
                      </p>
                      <div className="space-y-0">
                        {entry.faults_two != null && <DetailRow label="Faults" value={entry.faults_two} />}
                        {entry.time_two != null && <DetailRow label="Time" value={entry.time_two} />}
                        {entry.disqualify_status_two != null && (
                          <DetailRow label="Disqualify" value={entry.disqualify_status_two} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Scores — compact single block */}
              {scores.length > 0 && (
                <div className="rounded-lg border border-border-card bg-surface-card px-3 py-2.5">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <ListOrdered className="size-3.5" aria-hidden /> Scores
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-body">
                    {scores.map((s, i) => (
                      <span key={i} className="text-text-primary tabular-nums">
                        <span className="text-text-secondary mr-1">S{i + 1}:</span>
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

function App(): React.ReactElement {
  const [date, setDate] = useState<string>(getTodayStr());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ScheduleViewData | null>(null);
  const [expandedClassIds, setExpandedClassIds] = useState<Set<string>>(
    () => new Set()
  );
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(
    () => new Set()
  );

  const [filterHorse, setFilterHorse] = useState<string>("");
  const [filterRider, setFilterRider] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<StatusFilterValue>("all");
  const [filterClassType, setFilterClassType] = useState<string>("");

  const filteredEvents =
    data?.events != null && data.events.length > 0
      ? filterSchedule(data.events, {
          horseName: filterHorse,
          riderName: filterRider,
          status: filterStatus,
          classType: filterClassType,
        })
      : [];

  const hasActiveFilters =
    filterHorse.trim() !== "" ||
    filterRider.trim() !== "" ||
    filterStatus !== "all" ||
    filterClassType !== "";

  const uniqueClassTypes = data?.events ? getUniqueClassTypes(data.events) : [];

  const toggleClass = useCallback((classId: string) => {
    setExpandedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  }, []);

  const toggleEntry = useCallback((entryId: string) => {
    setExpandedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }, []);

  const loadSchedule = useCallback(async (): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      if (SCHEDULE_VIEW_API.useMockData) {
        await new Promise((r) => setTimeout(r, 400));
        const res = SCHEDULE_VIEW_API.mockResponse;
        if (res.status !== 1) {
          setError(res.message || "Unknown error");
          setData(null);
          return;
        }
        setData(res.data);
        return;
      }
      const url = SCHEDULE_VIEW_API.url(date);
      const response = await fetch(url, { headers: getApiHeaders() });
      const json = await response.json();
      if (json.status !== 1) {
        setError(json.message || "Unknown error");
        setData(null);
        return;
      }
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);


  return (
    <div className="min-h-screen bg-background-primary py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Header
          breadcrumb="Schedule"
          title="Schedule"
          subtitle={data?.show_name ? data.show_name : undefined}
          icon={<CalendarDays className="size-8 text-accent-green-dark" aria-hidden />}
        />

        {/* Toolbar: Schedule + Filters in one card */}
        <div className="mb-6 rounded-card border border-border-card bg-surface-card shadow-card overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-stretch">
            {/* Schedule: date + load — compact single row, do not stretch */}
            <div className="flex flex-wrap items-end gap-3 p-4 sm:py-4 sm:pr-4 shrink-0 sm:self-start">
              <div className="flex flex-col gap-1.5">
                <label className="font-body text-sm font-medium text-text-primary flex items-center gap-1.5">
                  <Calendar className="size-4 text-text-secondary" aria-hidden /> Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-40 font-body text-sm text-text-primary border border-border-card rounded-card px-3 py-2.5 bg-surface-card focus:outline-none focus:ring-2 focus:ring-accent-green"
                />
              </div>
              <div className="pb-0.5">
                <Button onClick={() => loadSchedule()} disabled={loading}>
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden /> Loading…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <RefreshCw className="size-4" aria-hidden /> Load
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* Full-height divider (only when filters visible) */}
            {!loading && data?.events && data.events.length > 0 && (
              <div
                className="shrink-0 w-px self-stretch bg-border-card min-h-[1px]"
                aria-hidden
              />
            )}

            {/* Filters: only when we have data */}
            {!loading && data?.events && data.events.length > 0 && (
              <div className="flex-1 min-w-0 p-4 sm:py-4 sm:pl-5 w-full">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wide flex items-center gap-1.5">
                    <Filter className="size-3.5" aria-hidden /> Filter by
                  </span>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterHorse("");
                        setFilterRider("");
                        setFilterStatus("all");
                        setFilterClassType("");
                      }}
                      className="text-xs font-medium text-accent-green-dark hover:text-accent-green focus:outline-none focus:underline inline-flex items-center gap-1"
                    >
                      <X className="size-3.5" aria-hidden /> Clear all
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-4 gap-y-4 sm:gap-4 items-end">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="filter-horse" className="font-body text-sm font-medium text-text-primary flex items-center gap-1.5">
                      <Search className="size-4 text-text-secondary" aria-hidden /> Horse
                    </label>
                    <Input
                      id="filter-horse"
                      type="text"
                      placeholder="Horse name"
                      value={filterHorse}
                      onChange={(e) => setFilterHorse(e.target.value)}
                      className="w-full min-w-0 sm:w-40"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="filter-rider" className="font-body text-sm font-medium text-text-primary flex items-center gap-1.5">
                      <User className="size-4 text-text-secondary" aria-hidden /> Rider
                    </label>
                    <Input
                      id="filter-rider"
                      type="text"
                      placeholder="Rider name"
                      value={filterRider}
                      onChange={(e) => setFilterRider(e.target.value)}
                      className="w-full min-w-0 sm:w-40"
                    />
                  </div>
                  <div className="w-full min-w-0 sm:w-32">
                    <label className="block font-body text-sm font-medium text-text-primary mb-1.5 flex items-center gap-1.5">
                      <ListFilter className="size-4 text-text-secondary" aria-hidden /> Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as StatusFilterValue)}
                      className="w-full font-body text-sm text-text-primary border border-border-card rounded-card px-3 py-2.5 bg-surface-card focus:outline-none focus:ring-2 focus:ring-accent-green"
                    >
                      <option value="all">All</option>
                      <option value="completed">Done</option>
                      <option value="active">In progress</option>
                      <option value="upcoming">Upcoming</option>
                    </select>
                  </div>
                  <div className="w-full min-w-0 sm:w-36">
                    <label className="block font-body text-sm font-medium text-text-primary mb-1.5 flex items-center gap-1.5">
                      <ListOrdered className="size-4 text-text-secondary" aria-hidden /> Class type
                    </label>
                    <select
                      value={filterClassType}
                      onChange={(e) => setFilterClassType(e.target.value)}
                      className="w-full font-body text-sm text-text-primary border border-border-card rounded-card px-3 py-2.5 bg-surface-card focus:outline-none focus:ring-2 focus:ring-accent-green"
                    >
                      <option value="">All types</option>
                      {uniqueClassTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="font-body text-warm-rust mb-4 flex items-center gap-2" role="alert">
            <AlertCircle className="size-5 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        {loading && !data && (
          <p className="font-body text-text-secondary flex items-center gap-2">
            <Loader2 className="size-4 animate-spin shrink-0" aria-hidden />
            Loading…
          </p>
        )}

        {!loading && data && (!data.events || data.events.length === 0) && (
          <p className="font-body text-text-secondary flex items-center gap-2">
            <CalendarX2 className="size-5 shrink-0" aria-hidden />
            No schedule for this date.
          </p>
        )}

        {!loading && data?.events && data.events.length > 0 && filteredEvents.length === 0 && (
          <p className="font-body text-text-secondary flex items-center gap-2">
            <SearchX className="size-5 shrink-0" aria-hidden />
            No entries match the current filters. Try adjusting or clearing filters.
          </p>
        )}

        {!loading && filteredEvents.length > 0 && (
          <div className="space-y-8">
            {filteredEvents.map((event: ScheduleEvent) => (
              <section
                key={event.id}
                className="bg-surface-card rounded-card shadow-card overflow-hidden"
              >
                <div className="px-5 py-3 border-b border-border-card">
                  <h2 className="font-heading text-xl font-bold text-accent-green-dark">
                    {event.name}
                    {event.ring_number != null && (
                      <span className="font-body font-normal text-text-secondary ml-2">
                        Ring {event.ring_number}
                      </span>
                    )}
                  </h2>
                </div>
                {event.classes.map((cls: ScheduleClass) => {
                  const isClassExpanded = expandedClassIds.has(cls.id);
                  return (
                    <div key={cls.id} className="border-b border-border-card/80 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => toggleClass(cls.id)}
                        className="w-full px-5 py-3 bg-surface-card-alt/50 hover:bg-surface-card-alt text-left font-body text-sm border-t border-border-card/60 cursor-pointer focus:outline-none flex items-center gap-2"
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
                          ({cls.entries.length} {cls.entries.length === 1 ? "entry" : "entries"})
                        </span>
                      </button>
                      {isClassExpanded && (
                        <div className="min-w-0">
                          {cls.entries.map((entry: ScheduleEntry) => {
                            const horseName = entry.horse?.name ?? "";
                            const riderName = entry.rider?.name ?? "";
                            const timeStr =
                              entry.estimated_start ||
                              entry.actual_start ||
                              "—";
                            const statusKind = entryStatusLabel(entry);
                            const isEntryExpanded = expandedEntryIds.has(entry.id);
                            return (
                              <div key={entry.id}>
                                <button
                                  type="button"
                                  onClick={() => toggleEntry(entry.id)}
                                  className="w-full flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-6 px-5 py-3 pl-8 text-left font-body text-sm border-t border-border-card/60 hover:bg-surface-card-alt/50 cursor-pointer focus:outline-none"
                                >
                                  <span className="w-20 shrink-0 font-medium text-text-primary tabular-nums">
                                    {timeStr}
                                  </span>
                                  <span className="min-w-0 flex-1 font-medium text-text-primary truncate">
                                    {horseName}
                                  </span>
                                  <span className="min-w-0 flex-1 text-text-primary truncate">
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
                                          : "Upcoming"}
                                    </Badge>
                                  </span>
                                  <span className="w-14 shrink-0 text-right text-text-secondary tabular-nums">
                                    {orderLabel(entry)}
                                  </span>
                                  <span className="shrink-0 text-text-secondary" aria-hidden>
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
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
