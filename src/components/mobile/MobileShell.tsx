import React, { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { MobileHeader } from "./MobileHeader";
import { BottomTabBar, type MobileTab } from "./BottomTabBar";
import { FilterSheet } from "./FilterSheet";
import { MobileOverviewTab } from "./MobileOverviewTab";
import { MobileClassesTab } from "./MobileClassesTab";
import { MobileRingView } from "./MobileRingView";
import { MobileRingBoard } from "./MobileRingBoard";
import { MobileNotificationsTab } from "./MobileNotificationsTab";
import { ConfirmSyncModal } from "../ConfirmSyncModal";
import { MobileChatView } from "../../views/MobileChatView";
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
  showChat?: boolean;
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
  showChat = false,
}) => {
  // Start on "chat" when the chat feature is enabled so users can begin
  // chatting immediately without waiting for overview data to load.
  const [activeTab, setActiveTab] = useState<MobileTab>(showChat ? "chat" : "overview");
  const [filterOpen, setFilterOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(false);

  const hasActiveFilters =
    filters.horseName !== "" ||
    filters.className !== "" ||
    filters.statusFilter !== "";

  return (
    <div className="min-h-screen bg-background-primary flex flex-col">
      {/* Chat takes over the full screen — rendered as a fixed overlay outside the shell */}
      {activeTab === "chat" && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col">
          <MobileChatView
            onExitChat={() => setActiveTab("overview")}
            onConversationChange={setConversationOpen}
          />
        </div>
      )}

      <MobileHeader
        showName={showName}
        date={date}
        onDateChange={onDateChange}
        onFilterOpen={() => setFilterOpen(true)}
        onSync={() => setSyncModalOpen(true)}
        syncing={syncing}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Scrollable content area */}
      <main
        className={`flex-1 overflow-x-hidden min-h-0 ${
          activeTab === "board"
            ? "overflow-hidden p-0"
            : "overflow-y-auto px-3 pt-3"
        }`}
        style={
          activeTab === "board"
            ? undefined
            : { paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px) + 0.75rem)" }
        }
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
            {activeTab === "board" && (
              <MobileRingBoard data={scheduleData} filters={filters} />
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

      {!conversationOpen && (
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          notificationCount={notifications.length}
          showChat={showChat}
        />
      )}

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        horseOptions={horseOptions}
        classOptions={classOptions}
        filters={filters}
        onChange={onFiltersChange}
      />

      <ConfirmSyncModal
        open={syncModalOpen}
        onCancel={() => setSyncModalOpen(false)}
        onConfirm={() => {
          setSyncModalOpen(false);
          onSync();
        }}
      />
    </div>
  );
};
