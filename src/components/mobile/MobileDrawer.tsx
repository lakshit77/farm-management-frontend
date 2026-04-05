import React, { useEffect, useRef } from "react";
import {
  Activity,
  Bell,
  BellOff,
  Calendar,
  ChevronRight,
  ClipboardList,
  Loader2,
  LogOut,
  X,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useTasks } from "../../contexts/TaskContext";

function formatDateForDisplay(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Derive a friendly display name from an email address (part before @).
 * Used as a last resort when neither display_name nor email yields a usable label.
 */
function nameFromEmail(email: string | null | undefined): string {
  if (!email) return "User";
  const local = email.split("@")[0] ?? "";
  return local
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || "User";
}

interface MobileDrawerProps {
  /** Whether the drawer is visible. */
  open: boolean;
  /** Called when the user requests to close the drawer. */
  onClose: () => void;
  /** Currently selected date string (YYYY-MM-DD). */
  date: string;
  /** Called when the user picks a new date. */
  onDateChange: (date: string) => void;
  /** Opens the ConfirmSyncModal. */
  onSync: () => void;
  /** Whether a sync is in progress. */
  syncing: boolean;
  /** Trimmed last-run timestamp, or null if never run. */
  classMonitoringLastRun: string | null;
  /** Opens the NotificationSettingsPanel full-screen overlay. */
  onNotificationSettings: () => void;
  /** Whether push notifications are subscribed on this device. */
  isNotificationSubscribed: boolean;
  /** True while push subscription state is being loaded from the server. */
  notificationSubscriptionSyncing?: boolean;
  /** Opens the TasksPanel full-screen overlay. */
  onTasksOpen: () => void;
}

/**
 * Mobile sidebar drawer containing secondary actions.
 *
 * Slides in from the left over all other content (including the bottom tab bar).
 * Profile block at top, menu rows in the middle, full-width Sign Out button
 * pinned at the bottom — matching the standard app drawer pattern.
 */
export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  open,
  onClose,
  date,
  onDateChange,
  onSync,
  syncing,
  classMonitoringLastRun,
  onNotificationSettings,
  isNotificationSubscribed,
  notificationSubscriptionSyncing = false,
  onTasksOpen,
}) => {
  const { user, displayName: authDisplayName, signOut } = useAuth();
  const { pendingCount } = useTasks();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const dateLabel = formatDateForDisplay(date);
  // Prefer the resolved display name from auth context (display_name → email);
  // fall back to the email-derived friendly name when neither is available.
  const displayName = authDisplayName ?? nameFromEmail(user?.email);
  const avatarLetter = (authDisplayName?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop — z-[75] sits above bottom tab bar (z-[70]) */}
      <div
        className={`fixed inset-0 z-[75] bg-black/50 transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* Left-side sliding panel — z-[76] above backdrop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`fixed top-0 left-0 bottom-0 z-[76] w-4/5 max-w-xs bg-surface-card shadow-2xl flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Close button — top right corner */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-text-secondary active:bg-background-primary transition-colors touch-manipulation z-10"
          aria-label="Close menu"
        >
          <X className="size-4" aria-hidden />
        </button>

        {/* ── Profile block ── */}
        <div className="px-5 pt-10 pb-4 border-b border-border-card shrink-0">
          {/* Avatar circle */}
          <div className="w-12 h-12 rounded-full bg-accent-green/20 flex items-center justify-center mb-2.5">
            <span className="font-heading text-lg font-bold text-accent-green-dark select-none">
              {avatarLetter}
            </span>
          </div>
          <p className="font-heading text-sm font-bold text-text-primary leading-tight truncate">
            {displayName}
          </p>
          {/* Show email as secondary line only when display_name is set and differs from email */}
          {user?.email && user.email !== authDisplayName && (
            <p
              className="font-body text-xs text-text-secondary leading-tight truncate mt-0.5 select-all"
              title={user.email}
            >
              {user.email}
            </p>
          )}
        </div>

        {/* ── Menu rows ── */}
        <div className="flex-1 overflow-y-auto py-2">

          {/* Date picker row */}
          <div className="relative">
            <div className="flex items-center gap-4 px-5 py-4 active:bg-background-primary transition-colors touch-manipulation">
              <Calendar className="size-4 text-text-secondary shrink-0" aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm text-text-primary leading-tight">
                  Show Date
                </p>
                <p className="font-body text-xs text-text-secondary leading-tight mt-0.5">
                  {dateLabel}
                </p>
              </div>
              <ChevronRight className="size-4 text-text-secondary shrink-0" aria-hidden />
            </div>
            {/* Full-row invisible date input */}
            <input
              ref={dateInputRef}
              type="date"
              value={date}
              onChange={(e) => {
                onDateChange(e.target.value);
                onClose();
              }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              aria-label="Select show date"
            />
          </div>

          <div className="mx-5 h-px bg-border-card" />

          {/* Sync row */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSync();
            }}
            disabled={syncing}
            className="w-full flex items-center gap-4 px-5 py-4 text-left disabled:opacity-50 active:bg-background-primary transition-colors touch-manipulation"
            aria-label="Sync data"
          >
            {syncing ? (
              <Loader2 className="size-4 text-accent-green-dark animate-spin shrink-0" aria-hidden />
            ) : (
              <Activity className="size-4 text-text-secondary shrink-0" aria-hidden />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-body text-sm text-text-primary leading-tight">
                Sync Data
              </p>
              <p className="font-body text-xs text-text-secondary leading-tight mt-0.5">
                {classMonitoringLastRun ? `Last run: ${classMonitoringLastRun}` : "Fetch latest updates"}
              </p>
            </div>
            <ChevronRight className="size-4 text-text-secondary shrink-0" aria-hidden />
          </button>

          <div className="mx-5 h-px bg-border-card" />

          {/* Tasks row */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onTasksOpen();
            }}
            className="w-full flex items-center gap-4 px-5 py-4 text-left active:bg-background-primary transition-colors touch-manipulation"
            aria-label="My tasks"
          >
            <ClipboardList className="size-4 text-text-secondary shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="font-body text-sm text-text-primary leading-tight">
                My Tasks
              </p>
              <p className="font-body text-xs text-text-secondary leading-tight mt-0.5">
                {pendingCount > 0
                  ? `${pendingCount} pending task${pendingCount !== 1 ? "s" : ""}`
                  : "View assigned tasks"}
              </p>
            </div>
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-warm-orange-brown text-white text-[11px] font-bold shrink-0">
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            )}
            <ChevronRight className="size-4 text-text-secondary shrink-0" aria-hidden />
          </button>

          <div className="mx-5 h-px bg-border-card" />

          {/* Notification settings row */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onNotificationSettings();
            }}
            className="w-full flex items-center gap-4 px-5 py-4 text-left active:bg-background-primary transition-colors touch-manipulation"
            aria-label="Notification settings"
          >
            {notificationSubscriptionSyncing ? (
              <Loader2
                className="size-4 text-text-secondary shrink-0 animate-spin"
                aria-hidden
              />
            ) : isNotificationSubscribed ? (
              <Bell className="size-4 text-text-secondary shrink-0" aria-hidden />
            ) : (
              <BellOff className="size-4 text-text-secondary shrink-0" aria-hidden />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-body text-sm text-text-primary leading-tight">
                Notifications
              </p>
              <p className="font-body text-xs text-text-secondary leading-tight mt-0.5">
                {notificationSubscriptionSyncing
                  ? "Checking this device…"
                  : isNotificationSubscribed
                    ? "Subscribed on this device"
                    : "Not subscribed"}
              </p>
            </div>
            <ChevronRight className="size-4 text-text-secondary shrink-0" aria-hidden />
          </button>

        </div>

        {/* ── Sign out — full-width pill button pinned at bottom ── */}
        <div
          className="px-5 py-4 shrink-0"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
        >
          <button
            type="button"
            onClick={() => {
              onClose();
              signOut();
            }}
            className="w-full h-11 rounded-full bg-background-primary border border-border-card font-body text-sm font-medium text-text-primary active:bg-border-card transition-colors touch-manipulation flex items-center justify-center gap-2"
            aria-label="Sign out"
          >
            <LogOut className="size-4 text-text-secondary" aria-hidden />
            Sign out
          </button>
        </div>
      </div>
    </>
  );
};
