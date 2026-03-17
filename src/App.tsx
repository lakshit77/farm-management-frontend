import React, { useState, useCallback } from "react";
import { Activity, Loader2, LogOut } from "lucide-react";
import { HeaderLabelContext } from "./contexts/HeaderLabelContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DashboardView } from "./views";
import { CLASS_MONITOR_API, getApiHeaders } from "./api";
import { DASHBOARD_REFRESH_EVENT } from "./constants";
import { useIsMobile } from "./hooks/useIsMobile";
import { ConfirmSyncModal } from "./components/ConfirmSyncModal";
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
      <AppInner />
    </AuthProvider>
  );
}

function AppShell(): React.ReactElement {
  const { signOut } = useAuth();
  const [headerLabel, setHeaderLabel] = useState<string | null>(null);
  const [classMonitoringLastRun, setClassMonitoringLastRun] = useState<string | null>(null);
  const [classMonitorLoading, setClassMonitorLoading] = useState<boolean>(false);
  const [syncModalOpen, setSyncModalOpen] = useState<boolean>(false);
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

  if (isMobile) {
    return (
      <HeaderLabelContext.Provider
        value={{
          headerLabel,
          setHeaderLabel,
          classMonitoringLastRun,
          setClassMonitoringLastRun,
        }}
      >
        <DashboardView />
      </HeaderLabelContext.Provider>
    );
  }

  return (
    <HeaderLabelContext.Provider
      value={{
        headerLabel,
        setHeaderLabel,
        classMonitoringLastRun,
        setClassMonitoringLastRun,
      }}
    >
      <div className="min-h-screen bg-background-primary flex flex-col min-w-0">
        <header className="h-14 min-h-14 flex items-center gap-3 px-6 bg-surface-card border-b border-border-card shadow-card shrink-0 safe-area-top">
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

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              aria-label="Sign out"
              className="inline-flex items-center justify-center h-9 w-9 font-body text-sm text-text-secondary bg-surface-card border border-border-card hover:bg-background-primary hover:text-warm-rust rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green focus:ring-offset-2 transition-colors"
            >
              <LogOut className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setSyncModalOpen(true)}
              disabled={classMonitorLoading}
              title={classMonitoringLastRun ? `Last run: ${classMonitoringLastRun}` : "Check active classes for status changes and results"}
              aria-label="Monitor classes: check for class updates and results"
              className="inline-flex items-center justify-center gap-2 h-9 font-body text-sm font-medium text-accent-green-dark bg-surface-card border border-border-card hover:bg-background-primary disabled:opacity-50 rounded-lg px-3.5 focus:outline-none focus:ring-2 focus:ring-accent-green focus:ring-offset-2 transition-colors"
            >
              {classMonitorLoading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Activity className="size-3.5" aria-hidden />
              )}
              <span className="inline-flex flex-col items-start">
                <span>Sync Data</span>
                {classMonitoringLastRun && (
                  <span className="text-xs font-normal text-text-secondary">
                    Last run: {trimLastRunForDisplay(classMonitoringLastRun) ?? classMonitoringLastRun}
                  </span>
                )}
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 min-w-0 min-h-0" id="main-content" role="main">
          <DashboardView />
        </main>

        <ConfirmSyncModal
          open={syncModalOpen}
          onCancel={() => setSyncModalOpen(false)}
          onConfirm={() => {
            setSyncModalOpen(false);
            handleClassMonitor();
          }}
        />
      </div>
    </HeaderLabelContext.Provider>
  );
}

export default App;
