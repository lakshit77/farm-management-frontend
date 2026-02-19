/**
 * DashboardView: single-page dashboard replacing the old sidebar navigation.
 *
 * On mount (and on every date change) it fetches both APIs in parallel so that
 * switching between the three tabs (Overview / Classes & Horses / Notifications)
 * requires no additional network calls.
 *
 * Shared date picker + Horse/Class dropdowns sit above the tab bar and drive
 * client-side filtering of the in-memory data.
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useContext,
} from "react";
import {
  Calendar,
  RefreshCw,
  Loader2,
  AlertCircle,
  LayoutDashboard,
  BookOpen,
  Bell,
  LayoutGrid,
} from "lucide-react";
import { HeaderLabelContext } from "../contexts/HeaderLabelContext";
import {
  SCHEDULE_VIEW_API,
  NOTIFICATIONS_API,
  getApiHeaders,
  type ScheduleViewData,
  type NotificationLogItem,
} from "../api";
import { DASHBOARD_REFRESH_EVENT } from "../constants";
import { FilterBar, type DashboardFilters } from "../components/FilterBar";
import { OverviewTab } from "../components/tabs/OverviewTab";
import { ClassesHorsesTab } from "../components/tabs/ClassesHorsesTab";
import { RingHorsesTab } from "../components/tabs/RingHorsesTab";
import { NotificationsTab } from "../components/tabs/NotificationsTab";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const NOTIF_INITIAL_LIMIT = 200;
const NOTIF_PAGE_SIZE = 50;

/** The four dashboard tabs. */
type DashboardTab = "overview" | "classes" | "rings" | "notifications";

const TABS: { id: DashboardTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "overview",
    label: "Overview",
    icon: <LayoutDashboard className="size-4" aria-hidden />,
  },
  {
    id: "classes",
    label: "Classes & Horses",
    icon: <BookOpen className="size-4" aria-hidden />,
  },
  {
    id: "rings",
    label: "Ring & Horses",
    icon: <LayoutGrid className="size-4" aria-hidden />,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <Bell className="size-4" aria-hidden />,
  },
];

// ---------------------------------------------------------------------------
// Derive dropdown options from schedule data
// ---------------------------------------------------------------------------

function getHorseOptions(data: ScheduleViewData | null): string[] {
  if (!data?.events) return [];
  const names = new Set<string>();
  for (const ev of data.events) {
    for (const cls of ev.classes) {
      for (const entry of cls.entries) {
        if (entry.horse?.name) names.add(entry.horse.name);
      }
    }
  }
  return Array.from(names).sort();
}

function getClassOptions(data: ScheduleViewData | null): string[] {
  if (!data?.events) return [];
  const names = new Set<string>();
  for (const ev of data.events) {
    for (const cls of ev.classes) {
      if (cls.name) names.add(cls.name);
    }
  }
  return Array.from(names).sort();
}

/**
 * Filter notifications client-side by the current horse/class filter.
 * Only filters when entry_id is present; unlinked notifications always show.
 */
function filterNotifications(
  items: NotificationLogItem[],
  filters: DashboardFilters,
  scheduleData: ScheduleViewData | null
): NotificationLogItem[] {
  if (!filters.horseName && !filters.className) return items;
  // Build a set of entry_ids that match the filter
  const matchingEntryIds = new Set<string>();
  if (scheduleData?.events) {
    for (const ev of scheduleData.events) {
      for (const cls of ev.classes) {
        const clsMatch =
          !filters.className ||
          cls.name.toLowerCase() === filters.className.toLowerCase();
        for (const entry of cls.entries) {
          const horseMatch =
            !filters.horseName ||
            (entry.horse?.name ?? "").toLowerCase() ===
              filters.horseName.toLowerCase();
          if (clsMatch && horseMatch) matchingEntryIds.add(entry.id);
        }
      }
    }
  }
  return items.filter(
    (n) => !n.entry_id || matchingEntryIds.has(n.entry_id)
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Single-page dashboard: parallel fetch on date change, frictionless tab switching,
 * unified Horse/Class filter applied across all tabs.
 */
export function DashboardView(): React.ReactElement {
  const [date, setDate] = useState<string>(getTodayStr);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [filters, setFilters] = useState<DashboardFilters>({
    horseName: "",
    className: "",
  });

  // Fetched data
  const [scheduleData, setScheduleData] = useState<ScheduleViewData | null>(null);
  const [notifications, setNotifications] = useState<NotificationLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Notification pagination
  const [notifOffset, setNotifOffset] = useState<number>(0);
  const [notifHasMore, setNotifHasMore] = useState<boolean>(false);
  const [loadingMoreNotifs, setLoadingMoreNotifs] = useState<boolean>(false);

  const { setHeaderLabel, setClassMonitoringLastRun } = useContext(HeaderLabelContext);

  // Derived options for filter dropdowns
  const horseOptions = useMemo(() => getHorseOptions(scheduleData), [scheduleData]);
  const classOptions = useMemo(() => getClassOptions(scheduleData), [scheduleData]);

  // Filtered notifications
  const filteredNotifications = useMemo(
    () => filterNotifications(notifications, filters, scheduleData),
    [notifications, filters, scheduleData]
  );

  // -------------------------------------------------------------------------
  // Fetch both APIs in parallel
  // -------------------------------------------------------------------------

  const fetchAll = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setFilters({ horseName: "", className: "" });

    try {
      if (SCHEDULE_VIEW_API.useMockData) {
        await new Promise((r) => setTimeout(r, 400));
        const sv = SCHEDULE_VIEW_API.mockResponse;
        const nf = NOTIFICATIONS_API.mockResponse;
        if (sv.status !== 1) {
          setError(sv.message || "Unknown error loading schedule");
          return;
        }
        setScheduleData(sv.data);
        setNotifications(nf.data.notifications);
        setNotifOffset(nf.data.notifications.length);
        setNotifHasMore(nf.data.notifications.length >= NOTIF_INITIAL_LIMIT);
        return;
      }

      const [svRes, nfRes] = await Promise.all([
        fetch(SCHEDULE_VIEW_API.url({ date }), { headers: getApiHeaders() }),
        fetch(
          NOTIFICATIONS_API.url({ date, limit: NOTIF_INITIAL_LIMIT, offset: 0 }),
          { headers: getApiHeaders() }
        ),
      ]);

      const [svJson, nfJson] = await Promise.all([svRes.json(), nfRes.json()]);

      if (svJson.status !== 1) {
        setError(svJson.message || "Unknown error loading schedule");
        setScheduleData(null);
      } else {
        setScheduleData(svJson.data);
      }

      if (nfJson.status === 1) {
        const list = (nfJson.data?.notifications ?? []) as NotificationLogItem[];
        setNotifications(list);
        setNotifOffset(list.length);
        setNotifHasMore(list.length === NOTIF_INITIAL_LIMIT);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setScheduleData(null);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Update header label and class monitoring last run for top bar
  useEffect(() => {
    if (scheduleData?.show_name) setHeaderLabel(scheduleData.show_name);
    else setHeaderLabel(null);
    setClassMonitoringLastRun(scheduleData?.class_monitoring_last_run ?? null);
    return () => {
      setHeaderLabel(null);
      setClassMonitoringLastRun(null);
    };
  }, [scheduleData?.show_name, scheduleData?.class_monitoring_last_run, setHeaderLabel, setClassMonitoringLastRun]);

  // Listen for refresh trigger from header actions (App.tsx)
  useEffect(() => {
    const handler = (): void => {
      fetchAll();
    };
    window.addEventListener(DASHBOARD_REFRESH_EVENT, handler);
    return () => window.removeEventListener(DASHBOARD_REFRESH_EVENT, handler);
  }, [fetchAll]);

  // -------------------------------------------------------------------------
  // Load more notifications
  // -------------------------------------------------------------------------

  const handleLoadMoreNotifications = useCallback(async (): Promise<void> => {
    if (NOTIFICATIONS_API.useMockData) return;
    setLoadingMoreNotifs(true);
    try {
      const res = await fetch(
        NOTIFICATIONS_API.url({
          date,
          limit: NOTIF_PAGE_SIZE,
          offset: notifOffset,
        }),
        { headers: getApiHeaders() }
      );
      const json = await res.json();
      if (json.status === 1) {
        const list = (json.data?.notifications ?? []) as NotificationLogItem[];
        setNotifications((prev) => [...prev, ...list]);
        setNotifOffset((prev) => prev + list.length);
        setNotifHasMore(list.length === NOTIF_PAGE_SIZE);
      }
    } catch {
      // silently fail load-more
    } finally {
      setLoadingMoreNotifs(false);
    }
  }, [date, notifOffset]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-full bg-background-primary">
      {/* ── Top toolbar ── */}
      <div className="sticky top-0 z-20 bg-surface-card border-b border-border-card shadow-card">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Controls bar — stacks on mobile */}
          <div className="py-2 sm:py-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 rounded-card border border-border-card bg-surface-card shadow-card px-3 py-2 sm:py-2 overflow-x-auto">

              {/* Row 1 on mobile: date + refresh | Row 1 on desktop: all inline */}
              <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
                {/* Date input */}
                <div className="relative shrink-0 flex-1 min-w-0 sm:flex-initial">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-secondary pointer-events-none" aria-hidden />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-10 sm:h-9 w-full sm:w-38 font-body text-sm text-text-primary border border-border-card rounded-lg pl-8 pr-2 bg-background-primary focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-transparent touch-manipulation"
                    aria-label="Show date"
                    style={{ minWidth: "8rem" }}
                  />
                </div>

                {/* Filter dropdowns — desktop only; mobile shows in row below */}
                {!loading && scheduleData && (
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <div className="h-6 w-px bg-border-card shrink-0 mx-1" aria-hidden />
                    <FilterBar
                      horseOptions={horseOptions}
                      classOptions={classOptions}
                      filters={filters}
                      onChange={setFilters}
                    />
                  </div>
                )}

                {/* Refresh — right on desktop, inline on mobile */}
                <div className="shrink-0 sm:ml-auto sm:pl-2">
                  <button
                    type="button"
                    onClick={fetchAll}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-0 sm:h-9 px-4 font-body text-sm font-medium text-text-on-dark bg-accent-green hover:bg-accent-green-dark disabled:opacity-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green focus:ring-offset-2 transition-colors touch-manipulation"
                  >
                    {loading
                      ? <Loader2 className="size-4 sm:size-3.5 animate-spin" aria-hidden />
                      : <RefreshCw className="size-4 sm:size-3.5" aria-hidden />}
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Filters on separate row on mobile */}
              {!loading && scheduleData && (
                <div className="sm:hidden w-full pt-2 border-t border-border-card/60 -mx-1 px-1">
                  <FilterBar
                    horseOptions={horseOptions}
                    classOptions={classOptions}
                    filters={filters}
                    onChange={setFilters}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Tab bar — horizontal scroll on mobile */}
          <div
            className="flex gap-0 -mb-px overflow-x-auto overflow-y-hidden scrollbar-hide -mx-3 sm:mx-0 px-3 sm:px-0"
            role="tablist"
            aria-label="Dashboard sections"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 font-body text-sm font-medium shrink-0 min-h-[44px] sm:min-h-0
                    border-b-2 focus:outline-none transition-colors touch-manipulation
                    ${
                      isActive
                        ? "border-accent-green-dark text-accent-green-dark"
                        : "border-transparent text-text-secondary hover:text-text-primary hover:border-border-card"
                    }
                  `}
                >
                  {tab.icon}
                  <span className="whitespace-nowrap">{tab.label}</span>
                  {tab.id === "notifications" && filteredNotifications.length > 0 && (
                    <span className="ml-0.5 sm:ml-1 bg-accent-green/15 text-accent-green-dark text-xs rounded-full px-1.5 py-0.5 tabular-nums">
                      {filteredNotifications.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main content area (full width for Ring & Horses tab) ── */}
      <div
        className={
          activeTab === "rings"
            ? "w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 min-w-0 overflow-x-hidden"
            : "max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 min-w-0 overflow-x-hidden"
        }
      >
        {/* Error */}
        {error && (
          <div className="mb-6 rounded-card border border-red-200 bg-red-50 p-4 flex items-center gap-3">
            <AlertCircle className="size-5 text-red-600 shrink-0" aria-hidden />
            <p className="font-body text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Full-page loading skeleton */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="size-10 animate-spin text-accent-green mb-4" aria-hidden />
            <p className="font-body text-text-secondary">Loading show data…</p>
          </div>
        )}

        {/* Tabs — rendered immediately from memory; no additional loading */}
        {!loading && (
          <div role="tabpanel">
            {activeTab === "overview" && (
              <OverviewTab data={scheduleData} filters={filters} />
            )}
            {activeTab === "classes" && (
              <ClassesHorsesTab data={scheduleData} filters={filters} />
            )}
            {activeTab === "rings" && (
              <RingHorsesTab data={scheduleData} filters={filters} />
            )}
            {activeTab === "notifications" && (
              <NotificationsTab
                notifications={filteredNotifications}
                loadingMore={loadingMoreNotifs}
                hasMore={notifHasMore}
                onLoadMore={handleLoadMoreNotifications}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
