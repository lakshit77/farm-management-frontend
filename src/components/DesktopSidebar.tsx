import React, { useEffect, useRef } from "react";
import { Activity, ClipboardList, LogOut, Users, X, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTasks } from "../contexts/TaskContext";

interface DesktopSidebarProps {
  /** Whether the sidebar panel is visible. */
  open: boolean;
  /** Called when the user requests to close the sidebar. */
  onClose: () => void;
  /** Trimmed last-run timestamp string to display below the Sync button, or null. */
  classMonitoringLastRun: string | null;
  /** Whether the class monitor fetch is in progress. */
  classMonitorLoading: boolean;
  /** Handler to open the sync confirmation modal. */
  onSyncClick: () => void;
  /** Handler to open the Tasks full-screen panel. */
  onTasksOpen: () => void;
  /** Handler to open the Show Entries full-screen panel. */
  onShowEntriesOpen: () => void;
}

/**
 * Slide-in sidebar panel for desktop, triggered by the hamburger button in the header.
 *
 * Contains secondary actions that don't need to be permanently visible:
 * - User profile (display name + email)
 * - Sync Data button + last-run timestamp
 * - Sign Out button
 *
 * Closes when the user clicks the backdrop, the X button, or presses Escape.
 */
export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  open,
  onClose,
  classMonitoringLastRun,
  classMonitorLoading,
  onSyncClick,
  onTasksOpen,
  onShowEntriesOpen,
}) => {
  const { user, displayName, signOut } = useAuth();
  const { pendingCount } = useTasks();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Trap focus inside panel when open
  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    }
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Settings and account"
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-surface-card border-l border-border-card shadow-lg flex flex-col outline-none
          transform transition-transform duration-250 ease-in-out
          ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-card shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/favicon.svg"
              alt=""
              className="w-6 h-6 rounded shrink-0"
              width={24}
              height={24}
              aria-hidden
            />
            <span className="font-heading text-sm font-bold text-accent-green-dark truncate">
              ShowGroundsLive
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-background-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-green focus:ring-offset-2"
            aria-label="Close sidebar"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-6">

          {/* Profile section */}
          <section aria-labelledby="sidebar-profile-heading">
            <p
              id="sidebar-profile-heading"
              className="font-body text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-2"
            >
              Signed in as
            </p>
            {displayName ? (
              <div className="bg-background-primary border border-border-card rounded-lg px-3 py-2">
                <p
                  className="font-body text-sm font-medium text-text-primary break-all"
                  title={displayName}
                >
                  {displayName}
                </p>
                {/* Show email as secondary line only when display_name differs from email */}
                {user?.email && user.email !== displayName && (
                  <p
                    className="font-body text-xs text-text-secondary break-all mt-0.5 select-all"
                    title={user.email}
                  >
                    {user.email}
                  </p>
                )}
              </div>
            ) : (
              <p className="font-body text-sm text-text-secondary italic">Unknown user</p>
            )}
          </section>

          {/* Sync section */}
          <section aria-labelledby="sidebar-sync-heading">
            <p
              id="sidebar-sync-heading"
              className="font-body text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-2"
            >
              Data Sync
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onSyncClick();
              }}
              disabled={classMonitorLoading}
              className="w-full inline-flex items-center justify-center gap-2 h-9 font-body text-sm font-medium text-accent-green-dark bg-surface-card border border-border-card hover:bg-background-primary disabled:opacity-50 rounded-lg px-3.5 focus:outline-none focus:ring-2 focus:ring-accent-green focus:ring-offset-2 transition-colors"
              aria-label="Monitor classes: check for class updates and results"
            >
              {classMonitorLoading ? (
                <Loader2 className="size-3.5 animate-spin shrink-0" aria-hidden />
              ) : (
                <Activity className="size-3.5 shrink-0" aria-hidden />
              )}
              <span>Sync Data</span>
            </button>
            {classMonitoringLastRun && (
              <p className="mt-1.5 font-body text-xs text-text-secondary text-center">
                Last run: {classMonitoringLastRun}
              </p>
            )}
          </section>
          {/* Show Entries section */}
          <section aria-labelledby="sidebar-entries-heading">
            <p
              id="sidebar-entries-heading"
              className="font-body text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-2"
            >
              Show Entries
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onShowEntriesOpen();
              }}
              className="w-full inline-flex items-center gap-2 h-9 font-body text-sm font-medium text-text-primary bg-surface-card border border-border-card hover:bg-background-primary rounded-lg px-3.5 focus:outline-none focus:ring-2 focus:ring-accent-green focus:ring-offset-2 transition-colors"
              aria-label="Open Show Entries panel"
            >
              <Users className="size-3.5 shrink-0 text-text-secondary" aria-hidden />
              <span>Show Entries</span>
            </button>
          </section>

          {/* Tasks section */}
          <section aria-labelledby="sidebar-tasks-heading">
            <p
              id="sidebar-tasks-heading"
              className="font-body text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-2"
            >
              Tasks
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onTasksOpen();
              }}
              className="w-full inline-flex items-center justify-between gap-2 h-9 font-body text-sm font-medium text-text-primary bg-surface-card border border-border-card hover:bg-background-primary rounded-lg px-3.5 focus:outline-none focus:ring-2 focus:ring-accent-green focus:ring-offset-2 transition-colors"
              aria-label="Open My Tasks panel"
            >
              <span className="inline-flex items-center gap-2">
                <ClipboardList className="size-3.5 shrink-0 text-text-secondary" aria-hidden />
                <span>My Tasks</span>
              </span>
              {pendingCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-warm-orange-brown text-white text-[11px] font-bold shrink-0">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </button>
            {pendingCount > 0 && (
              <p className="mt-1.5 font-body text-xs text-text-secondary text-center">
                {pendingCount} pending task{pendingCount !== 1 ? "s" : ""}
              </p>
            )}
          </section>
        </div>

        {/* Footer: sign out */}
        <div className="shrink-0 px-5 py-4 border-t border-border-card">
          <button
            type="button"
            onClick={() => {
              onClose();
              signOut();
            }}
            className="w-full inline-flex items-center justify-center gap-2 h-9 font-body text-sm font-medium text-warm-rust bg-surface-card border border-border-card hover:bg-background-primary rounded-lg px-3.5 focus:outline-none focus:ring-2 focus:ring-accent-green focus:ring-offset-2 transition-colors"
          >
            <LogOut className="size-3.5 shrink-0" aria-hidden />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};
