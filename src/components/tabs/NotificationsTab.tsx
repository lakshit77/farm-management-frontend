/**
 * Notifications tab: renders the filtered notification feed.
 * Data is passed in from DashboardView (already fetched); no internal API calls.
 */

import React from "react";
import {
  Trophy,
  Clock,
  CheckCircle2,
  Flag,
  XCircle,
  BarChart3,
  ListChecks,
  Bell,
  Loader2,
} from "lucide-react";
import type { NotificationLogItem } from "../../api";

/** Notification type display config: label, icon, badge colour classes. */
const NOTIFICATION_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; iconBg: string; textColor: string }
> = {
  RESULT: {
    label: "Result",
    icon: <Trophy className="size-4" aria-hidden />,
    iconBg: "bg-amber-100",
    textColor: "text-amber-800",
  },
  TIME_CHANGE: {
    label: "Time change",
    icon: <Clock className="size-4" aria-hidden />,
    iconBg: "bg-orange-100",
    textColor: "text-orange-700",
  },
  STATUS_CHANGE: {
    label: "Class status",
    icon: <Flag className="size-4" aria-hidden />,
    iconBg: "bg-green-100",
    textColor: "text-accent-green-dark",
  },
  PROGRESS_UPDATE: {
    label: "Progress",
    icon: <BarChart3 className="size-4" aria-hidden />,
    iconBg: "bg-green-100",
    textColor: "text-accent-green-dark",
  },
  HORSE_COMPLETED: {
    label: "Horse completed",
    icon: <CheckCircle2 className="size-4" aria-hidden />,
    iconBg: "bg-green-100",
    textColor: "text-accent-green-dark",
  },
  SCRATCHED: {
    label: "Scratched",
    icon: <XCircle className="size-4" aria-hidden />,
    iconBg: "bg-red-100",
    textColor: "text-red-700",
  },
};

/** Format ISO datetime to time + short date. */
function formatNotifTime(iso: string): { time: string; date: string } {
  try {
    const d = new Date(iso);
    return {
      time: d.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      date: d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    };
  } catch {
    return { time: "—", date: "—" };
  }
}

interface NotificationsTabProps {
  /** Full notification list for the selected date (already fetched). */
  notifications: NotificationLogItem[];
  /** Whether more notifications are still loading (load more). */
  loadingMore: boolean;
  /** Whether there are more notifications to load. */
  hasMore: boolean;
  /** Called when user clicks "Load more". */
  onLoadMore: () => void;
}

/**
 * Notification feed showing all notifications for the current date/filters.
 * Frictionless: data already in memory, no loading state on tab switch.
 */
export const NotificationsTab: React.FC<NotificationsTabProps> = ({
  notifications,
  loadingMore,
  hasMore,
  onLoadMore,
}) => {
  const typeConfig = (type: string) =>
    NOTIFICATION_TYPE_CONFIG[type] ?? {
      label: type,
      icon: <ListChecks className="size-4" aria-hidden />,
      iconBg: "bg-gray-100",
      textColor: "text-text-secondary",
    };

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Bell className="size-12 text-border-card mb-4" aria-hidden />
        <p className="font-body text-text-secondary">No notifications for this date or filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="rounded-card border border-border-card bg-surface-card shadow-card divide-y divide-border-card overflow-hidden">
        {notifications.map((item) => {
          const cfg = typeConfig(item.notification_type);
          const { time, date } = formatNotifTime(item.created_at);
          return (
            <li
              key={item.id}
              className="p-4 sm:p-5 hover:bg-surface-card-alt/50 transition-colors"
            >
              <div className="flex gap-3 sm:gap-4">
                {/* Type icon circle */}
                <div
                  className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${cfg.iconBg} ${cfg.textColor}`}
                  aria-hidden
                >
                  {cfg.icon}
                </div>

                <div className="min-w-0 flex-1">
                  {/* Top row: badge + timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.iconBg} ${cfg.textColor}`}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </span>
                    <span className="font-body text-xs text-text-secondary tabular-nums">
                      {time}
                      <span className="ml-1 text-text-secondary/70">{date}</span>
                    </span>
                  </div>

                  {/* Message */}
                  {item.message && (
                    <p className="font-body text-sm font-medium text-text-primary mb-1">
                      {item.message}
                    </p>
                  )}

                  {/* Payload key/values */}
                  {item.payload &&
                    typeof item.payload === "object" &&
                    Object.keys(item.payload).length > 0 && (
                      <p className="font-body text-xs text-text-secondary">
                        {Object.entries(item.payload)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(" • ")}
                      </p>
                    )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 font-body text-sm font-medium text-accent-green-dark border border-border-card rounded-card px-5 py-2.5 bg-surface-card hover:bg-surface-card-alt focus:outline-none focus:ring-2 focus:ring-accent-green disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Loading…
              </>
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}
    </div>
  );
};
