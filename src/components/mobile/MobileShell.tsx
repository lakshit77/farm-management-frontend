import React, { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { MobileHeader } from "./MobileHeader";
import { BottomTabBar, type MobileTab } from "./BottomTabBar";
import { FilterSheet } from "./FilterSheet";
import { MobileOverviewTab } from "./MobileOverviewTab";
import { MobileClassesTab } from "./MobileClassesTab";
import { MobileRingView } from "./MobileRingView";
import { MobileNotificationsTab } from "./MobileNotificationsTab";
import type { DashboardFilters } from "../FilterBar";
import type { ScheduleViewData, NotificationLogItem } from "../../api";

interface MobileShellProps {
  showName: string | null;
  date: string;
  onDateChange: (date: string) => void;
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  horseOptions: string[];
  classOptions: string[];
  onSync: () => void;
  syncing: boolean;
  onRefresh: () => void;
  loading: boolean;
  error: string | null;
  scheduleData: ScheduleViewData | null;
  notifications: NotificationLogItem[];
  loadingMoreNotifs: boolean;
  notifHasMore: boolean;
  onLoadMoreNotifs: () => void;
}

export const MobileShell: React.FC<MobileShellProps> = ({
  showName,
  date,
  onDateChange,
  filters,
  onFiltersChange,
  horseOptions,
  classOptions,
  onSync,
  syncing,
  loading,
  error,
  scheduleData,
  notifications,
  loadingMoreNotifs,
  notifHasMore,
  onLoadMoreNotifs,
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>("overview");
  const [filterOpen, setFilterOpen] = useState(false);

  const hasActiveFilters =
    filters.horseName !== "" ||
    filters.className !== "" ||
    filters.statusFilter !== "";

  return (
    <div className="min-h-screen bg-background-primary flex flex-col">
      <MobileHeader
        showName={showName}
        date={date}
        onDateChange={onDateChange}
        onFilterOpen={() => setFilterOpen(true)}
        onSync={onSync}
        syncing={syncing}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Scrollable content area */}
      <main
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 pt-3 min-h-0"
        style={{ paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
      >
        {/* Error banner */}
        {error && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 flex items-center gap-2">
            <AlertCircle className="size-4 text-red-600 shrink-0" aria-hidden />
            <p className="font-body text-xs text-red-800">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-accent-green mb-3" aria-hidden />
            <p className="font-body text-sm text-text-secondary">Loading...</p>
          </div>
        )}

        {/* Tab content */}
        {!loading && (
          <>
            {activeTab === "overview" && (
              <MobileOverviewTab data={scheduleData} filters={filters} />
            )}
            {activeTab === "classes" && (
              <MobileClassesTab data={scheduleData} filters={filters} />
            )}
            {activeTab === "rings" && (
              <MobileRingView data={scheduleData} filters={filters} />
            )}
            {activeTab === "notifications" && (
              <MobileNotificationsTab
                notifications={notifications}
                loadingMore={loadingMoreNotifs}
                hasMore={notifHasMore}
                onLoadMore={onLoadMoreNotifs}
              />
            )}
          </>
        )}
      </main>

      <BottomTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        notificationCount={notifications.length}
      />

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        horseOptions={horseOptions}
        classOptions={classOptions}
        filters={filters}
        onChange={onFiltersChange}
      />
    </div>
  );
};
