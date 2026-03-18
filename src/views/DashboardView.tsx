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
  MessageCircle,
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
import { entryStatusKind } from "../utils/entryStatus";
import { FilterBar, type DashboardFilters } from "../components/FilterBar";
import { OverviewTab } from "../components/tabs/OverviewTab";
import { ClassesHorsesTab } from "../components/tabs/ClassesHorsesTab";
import { RingHorsesTab } from "../components/tabs/RingHorsesTab";
import { NotificationsTab } from "../components/tabs/NotificationsTab";
import { ChatView } from "./ChatView";
import { useIsMobile } from "../hooks/useIsMobile";
import { MobileShell } from "../components/mobile/MobileShell";
import { useAuth } from "../contexts/AuthContext";
import { ENABLE_CHAT } from "../config";

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

/** The five dashboard tabs. */
type DashboardTab = "overview" | "classes" | "rings" | "notifications" | "chat";

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
  {
    id: "chat",
    label: "Chat",
    icon: <MessageCircle className="size-4" aria-hidden />,
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
 * Filter notifications client-side by the current horse/class/status filter.
 * Only filters when entry_id is present; unlinked notifications always show.
 */
function filterNotifications(
  items: NotificationLogItem[],
  filters: DashboardFilters,
  scheduleData: ScheduleViewData | null
): NotificationLogItem[] {
  if (
    !filters.horseName &&
    !filters.className &&
    !filters.statusFilter
  )
    return items;
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
          const statusMatch =
            !filters.statusFilter ||
            entryStatusKind(entry) === filters.statusFilter;
          if (clsMatch && horseMatch && statusMatch)
            matchingEntryIds.add(entry.id);
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
  const { role, farmId, enableChat } = useAuth();
  // Per-user metadata takes precedence; fall back to the global config flag.
  const chatFeatureOn = enableChat !== null ? enableChat : ENABLE_CHAT;
  const chatEnabled = chatFeatureOn && Boolean(role && farmId);

  const [date, setDate] = useState<string>(getTodayStr);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [filters, setFilters] = useState<DashboardFilters>({
    horseName: "",
    className: "",
    statusFilter: "",
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
    setFilters({ horseName: "", className: "", statusFilter: "" });

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

  const isMobile = useIsMobile();

  const visibleTabs = TABS.filter((t) => t.id !== "chat" || chatEnabled);

  if (isMobile) {
    return (
      <MobileShell
        showName={scheduleData?.show_name ?? null}
        date={date}
        onDateChange={setDate}
        filters={filters}
        onFiltersChange={setFilters}
        horseOptions={horseOptions}
        classOptions={classOptions}
        onSync={fetchAll}
        syncing={loading}
        onRefresh={fetchAll}
        loading={loading}
        error={error}
        scheduleData={scheduleData}
        notifications={filteredNotifications}
        loadingMoreNotifs={loadingMoreNotifs}
        notifHasMore={notifHasMore}
        onLoadMoreNotifs={handleLoadMoreNotifications}
        showChat={chatEnabled}
      />
    );
  }

  return (
    <div className="min-h-full bg-background-primary">
      {/* ── Top toolbar ── */}
      <div className="sticky top-0 z-20 bg-surface-card border-b border-border-card shadow-card">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Controls bar */}
          <div className="py-2 sm:py-3">
            <div className="flex flex-row items-center gap-2 rounded-card border border-border-card bg-surface-card shadow-card px-3 py-2 overflow-x-auto">

              <div className="flex items-center gap-2 min-w-0 flex-initial">
                {/* Date input */}
                <div className="relative flex-initial">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-secondary pointer-events-none" aria-hidden />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-9 w-38 font-body text-sm text-text-primary border border-border-card rounded-lg pl-8 pr-2 bg-background-primary focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-transparent"
                    aria-label="Show date"
                    style={{ minWidth: "8rem" }}
                  />
                </div>

                {/* Filter dropdowns */}
                {!loading && scheduleData && (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="h-6 w-px bg-border-card shrink-0 mx-1" aria-hidden />
                    <FilterBar
                      horseOptions={horseOptions}
                      classOptions={classOptions}
                      filters={filters}
                      onChange={setFilters}
                    />
                  </div>
                )}

                {/* Refresh */}
                <div className="shrink-0 ml-auto pl-2">
                  <button
                    type="button"
                    onClick={fetchAll}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-4 font-body text-sm font-medium text-text-on-dark bg-accent-green hover:bg-accent-green-dark disabled:opacity-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green focus:ring-offset-2 transition-colors"
                  >
                    {loading
                      ? <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      : <RefreshCw className="size-3.5" aria-hidden />}
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div
            className="flex gap-0 -mb-px"
            role="tablist"
            aria-label="Dashboard sections"
          >
            {visibleTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    inline-flex items-center gap-2 px-4 py-3 font-body text-sm font-medium shrink-0
                    border-b-2 focus:outline-none transition-colors
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
                    <span className="ml-1 bg-accent-green/15 text-accent-green-dark text-xs rounded-full px-1.5 py-0.5 tabular-nums">
                      {filteredNotifications.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main content area ── */}
      <div
        className={
          activeTab === "chat"
            ? "w-full px-4 lg:px-6 py-4 min-w-0 overflow-hidden"
            : activeTab === "rings"
            ? "w-full px-6 lg:px-8 py-6 min-w-0 overflow-x-hidden"
            : "max-w-6xl mx-auto px-6 lg:px-8 py-6 min-w-0 overflow-x-hidden"
        }
      >
        {/* Chat tab renders independently of schedule loading state */}
        {activeTab === "chat" && <ChatView />}

        {activeTab !== "chat" && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
