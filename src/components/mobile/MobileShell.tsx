import React, { useState, useEffect, useContext } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { MobileHeader } from "./MobileHeader";
import { MobileDrawer } from "./MobileDrawer";
import { BottomTabBar, type MobileTab } from "./BottomTabBar";
import { FilterSheet } from "./FilterSheet";
import { MobileOverviewTab } from "./MobileOverviewTab";
import { MobileClassesTab } from "./MobileClassesTab";
import { MobileRingView } from "./MobileRingView";
import { MobileRingBoard } from "./MobileRingBoard";
import { MobileNotificationsTab } from "./MobileNotificationsTab";
import { ConfirmSyncModal } from "../ConfirmSyncModal";
import { MobileChatView } from "../../views/MobileChatView";
import { IosBanner } from "../notifications/IosBanner";
import { SoftPermissionPrompt } from "../notifications/SoftPermissionPrompt";
import { NotificationSettingsPanel } from "../notifications/NotificationSettingsPanel";
import { TasksPanel } from "../tasks/TasksPanel";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import { useAuth } from "../../contexts/AuthContext";
import { HeaderLabelContext } from "../../contexts/HeaderLabelContext";
import { supabase } from "../../lib/supabase";
import type { DashboardFilters } from "../FilterBar";
import type { ScheduleViewData, NotificationLogItem } from "../../api";

/**
 * Trim full class monitoring last-run string from backend to minimal for UI.
 * Backend sends e.g. "Wed, 19 Feb 2026, 10:30 AM EST"; we show "10:30 AM ET".
 */
function trimLastRunForDisplay(full: string | null): string | null {
  if (!full || !full.trim()) return null;
  const parts = full.split(",").map((p) => p.trim());
  const last = parts[parts.length - 1];
  if (!last) return full;
  return last.replace(/\s+(EST|EDT)$/i, " ET");
}

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

/**
 * Root mobile layout: slim header, bottom-sheet drawer, scrollable content,
 * bottom tab bar, filter sheet, and all overlay panels.
 */
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [notifSettingsOpen, setNotifSettingsOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);

  // Consume classMonitoringLastRun from context (set by DashboardView)
  const { classMonitoringLastRun } = useContext(HeaderLabelContext);

  // ── Push notifications setup ──────────────────────────────────────────────
  const { user, farmId } = useAuth();
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAccessToken(data.session?.access_token ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      setAccessToken(session?.access_token ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const push = usePushNotifications({
    userId: user?.id ?? null,
    farmId: farmId ?? null,
    accessToken,
  });

  // Detect iOS in Safari (not standalone) for the install banner
  const isIosSafari =
    typeof navigator !== "undefined" &&
    /iphone|ipad/i.test(navigator.userAgent) &&
    !push.isStandalone;

  const hasActiveFilters =
    filters.horseName !== "" ||
    filters.className !== "" ||
    filters.statusFilter !== "";

  return (
    <div className="min-h-screen bg-background-primary flex flex-col">
      {/* Notification settings full-screen panel */}
      {notifSettingsOpen && (
        <div className="fixed inset-0 z-[80] bg-background-primary flex flex-col">
          <NotificationSettingsPanel
            push={push}
            onClose={() => setNotifSettingsOpen(false)}
          />
        </div>
      )}

      {/* Tasks full-screen panel */}
      {tasksOpen && (
        <div className="fixed inset-0 z-[80] bg-background-primary flex flex-col">
          <TasksPanel onClose={() => setTasksOpen(false)} />
        </div>
      )}

      {/* Chat takes over the full screen — rendered as a fixed overlay outside the shell */}
      {activeTab === "chat" && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col">
          <MobileChatView
            onExitChat={() => setActiveTab("overview")}
            onConversationChange={setConversationOpen}
          />
        </div>
      )}

      {/* iOS "Add to Home Screen" banner (shown above header on iOS Safari) */}
      <IosBanner visible={isIosSafari} />

      <MobileHeader
        showName={showName}
        date={date}
        onFilterOpen={() => setFilterOpen(true)}
        hasActiveFilters={hasActiveFilters}
        onDrawerOpen={() => setDrawerOpen(true)}
      />

      {/* Bottom-sheet drawer for secondary actions */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        date={date}
        onDateChange={onDateChange}
        onSync={() => setSyncModalOpen(true)}
        syncing={syncing}
        classMonitoringLastRun={trimLastRunForDisplay(classMonitoringLastRun)}
        onNotificationSettings={() => setNotifSettingsOpen(true)}
        isNotificationSubscribed={push.isSubscribed}
        notificationSubscriptionSyncing={push.subscriptionSyncLoading}
        onTasksOpen={() => setTasksOpen(true)}
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

      {/* Soft permission prompt — shown 5s after first open, floats above the tab bar */}
      {!isIosSafari && !notifSettingsOpen && (
        <SoftPermissionPrompt
          promptState={push.promptState}
          isLoading={push.isLoading}
          error={push.error}
          onEnable={() => void push.subscribe()}
          onDismiss={push.dismissPrompt}
        />
      )}

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
