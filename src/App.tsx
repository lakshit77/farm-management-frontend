import React, { useState, useCallback } from "react";
import { Loader2, Menu } from "lucide-react";
import { HeaderLabelContext } from "./contexts/HeaderLabelContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ChatProvider } from "./contexts/ChatContext";
import { DashboardView } from "./views";
import { CLASS_MONITOR_API, getApiHeaders } from "./api";
import { DASHBOARD_REFRESH_EVENT } from "./constants";
import { useIsMobile } from "./hooks/useIsMobile";
import { ConfirmSyncModal } from "./components/ConfirmSyncModal";
import { DesktopSidebar } from "./components/DesktopSidebar";
import LoginPage from "./components/LoginPage";

function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

/**
 * Root app: single-page dashboard layout with a top header bar.
 * The old sidebar + tab routing has been replaced by DashboardView's
 * internal tab bar and shared filter.
 */
function AppInner(): React.ReactElement {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AppShell />;
}

function App(): React.ReactElement {
  return (
    <AuthProvider>
      <ChatProvider>
        <AppInner />
      </ChatProvider>
    </AuthProvider>
  );
}

function AppShell(): React.ReactElement {
  const [headerLabel, setHeaderLabel] = useState<string | null>(null);
  const [classMonitoringLastRun, setClassMonitoringLastRun] = useState<string | null>(null);
  const [classMonitorLoading, setClassMonitorLoading] = useState<boolean>(false);
  const [syncModalOpen, setSyncModalOpen] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const isMobile = useIsMobile();

  const triggerDashboardRefresh = useCallback((): void => {
    window.dispatchEvent(new CustomEvent(DASHBOARD_REFRESH_EVENT));
  }, []);

  const handleClassMonitor = useCallback(async (): Promise<void> => {
    setClassMonitorLoading(true);
    try {
      if (CLASS_MONITOR_API.useMockData) {
        await new Promise((r) => setTimeout(r, 600));
        if (CLASS_MONITOR_API.mockResponse.status === 1) {
          triggerDashboardRefresh();
        }
        return;
      }
      const res = await fetch(CLASS_MONITOR_API.url({ date: getTodayStr() }), {
        headers: getApiHeaders(),
      });
      const json = await res.json();
      if (json.status === 1) {
        triggerDashboardRefresh();
      }
    } finally {
      setClassMonitorLoading(false);
    }
  }, [triggerDashboardRefresh]);

  // DashboardView is always rendered at the same tree position regardless of
  // isMobile, so its internal state (active tab, etc.) is never reset when the
  // viewport crosses the breakpoint. The desktop chrome (header, sync modal) is
  // conditionally shown around it.
  return (
    <HeaderLabelContext.Provider
      value={{
        headerLabel,
        setHeaderLabel,
        classMonitoringLastRun,
        setClassMonitoringLastRun,
      }}
    >
      <div className={!isMobile ? "min-h-screen bg-background-primary flex flex-col min-w-0" : undefined}>
        {/* Desktop-only top header */}
        {!isMobile && (
          <header className="h-14 min-h-14 flex items-center gap-3 px-4 bg-surface-card border-b border-border-card shadow-card shrink-0 safe-area-top">
            <img
              src="/favicon.svg"
              alt=""
              className="w-7 h-7 rounded-md shrink-0"
              width={28}
              height={28}
              aria-hidden
            />
            <span className="font-heading text-lg font-bold text-accent-green-dark truncate min-w-0">
              ShowGroundsLive
            </span>
            {headerLabel && (
              <>
                <span className="text-border-card mx-1 shrink-0">/</span>
                <span className="font-body text-sm font-medium text-warm-orange-brown truncate min-w-0">
                  {headerLabel}
                </span>
              </>
            )}

            {/* Hamburger button — opens the sidebar */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open settings and account"
              aria-expanded={sidebarOpen}
              aria-haspopup="dialog"
              className="ml-auto inline-flex items-center justify-center h-9 w-9 text-text-secondary bg-surface-card border border-border-card hover:bg-background-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green focus:ring-offset-2 transition-colors shrink-0"
            >
              {classMonitorLoading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Menu className="size-4" aria-hidden />
              )}
            </button>
          </header>
        )}

        {/* DashboardView is always at the same tree position to prevent
            remounts (and tab-state resets) when the viewport breakpoint changes.
            On desktop it fills the flex column; on mobile it is the only child. */}
        <main className={!isMobile ? "flex-1 min-w-0 min-h-0" : undefined} id="main-content" role="main">
          <DashboardView />
        </main>

        {/* Desktop-only sidebar */}
        {!isMobile && (
          <DesktopSidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            classMonitoringLastRun={trimLastRunForDisplay(classMonitoringLastRun)}
            classMonitorLoading={classMonitorLoading}
            onSyncClick={() => setSyncModalOpen(true)}
          />
        )}

        {/* Desktop-only sync confirm modal */}
        {!isMobile && (
          <ConfirmSyncModal
            open={syncModalOpen}
            onCancel={() => setSyncModalOpen(false)}
            onConfirm={() => {
              setSyncModalOpen(false);
              handleClassMonitor();
            }}
          />
        )}
      </div>
    </HeaderLabelContext.Provider>
  );
}

export default App;
