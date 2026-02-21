import React, { useState, useCallback } from "react";
import { Activity, Loader2 } from "lucide-react";
import { HeaderLabelContext } from "./contexts/HeaderLabelContext";
import { DashboardView } from "./views";
import { CLASS_MONITOR_API, getApiHeaders } from "./api";
import { DASHBOARD_REFRESH_EVENT } from "./constants";

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
function App(): React.ReactElement {
  const [headerLabel, setHeaderLabel] = useState<string | null>(null);
  const [classMonitoringLastRun, setClassMonitoringLastRun] = useState<string | null>(null);
  const [classMonitorLoading, setClassMonitorLoading] = useState<boolean>(false);

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
        {/* Branding header — mobile-friendly with touch targets */}
        <header className="h-14 min-h-14 flex items-center gap-2 sm:gap-3 px-3 sm:px-6 bg-surface-card border-b border-border-card shadow-card shrink-0 safe-area-top">
          <img
            src="/favicon.svg"
            alt=""
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-md shrink-0"
            width={28}
            height={28}
            aria-hidden
          />
          <span className="font-heading text-base sm:text-lg font-bold text-accent-green-dark truncate min-w-0">
            ShowGroundsLive
          </span>
          {headerLabel && (
            <>
              <span className="text-border-card mx-1 hidden sm:block shrink-0">/</span>
              <span className="font-body text-sm font-medium text-warm-orange-brown truncate hidden sm:block min-w-0">
                {headerLabel}
              </span>
            </>
          )}

          {/* Monitor Classes button + last run (from schedule view API) */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleClassMonitor}
              disabled={classMonitorLoading}
              title={classMonitoringLastRun ? `Last run: ${classMonitoringLastRun}` : "Check active classes for status changes and results"}
              aria-label="Monitor classes: check for class updates and results"
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px] min-w-[44px] sm:min-w-0 sm:h-9 font-body text-sm font-medium text-accent-green-dark bg-surface-card border border-border-card hover:bg-background-primary disabled:opacity-50 rounded-lg px-2.5 sm:px-3.5 focus:outline-none focus:ring-2 focus:ring-accent-green focus:ring-offset-2 transition-colors touch-manipulation"
            >
              {classMonitorLoading ? (
                <Loader2 className="size-4 sm:size-3.5 animate-spin" aria-hidden />
              ) : (
                <Activity className="size-4 sm:size-3.5" aria-hidden />
              )}
              <span className="hidden md:inline-flex flex-col items-start">
                <span>Sync Data</span>
                {classMonitoringLastRun && (
                  <span className="text-xs font-normal text-text-secondary">
                    Last run: {trimLastRunForDisplay(classMonitoringLastRun) ?? classMonitoringLastRun}
                  </span>
                )}
              </span>
              <span className="md:hidden sr-only">Monitor</span>
            </button>
          </div>
        </header>

        <main className="flex-1 min-w-0 min-h-0" id="main-content" role="main">
          <DashboardView />
        </main>
      </div>
    </HeaderLabelContext.Provider>
  );
}

export default App;
