/**
 * Notifications tab: renders the filtered notification feed.
 * Data is passed in from DashboardView (already fetched); no internal API calls.
 * Uses fixed templates and proper icons per notification type; no raw payload display.
 * Tabs for easy navigation by category.
 */

import React, { useMemo, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import type { NotificationLogItem } from "../../api";
import {
  getNotificationDisplayConfig,
  getCategoryOrder,
  CATEGORY_LABELS,
  type NotificationCategory,
} from "../../utils/notificationConfig";
import { DISPLAY_TIMEZONE } from "../../config";

const CATEGORY_TABS: { value: NotificationCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "class", label: "Class updates" },
  { value: "horse", label: "Horse activity" },
  { value: "availability", label: "Horse availability" },
  { value: "result", label: "Results" },
];

/** Format ISO datetime to time + short date in DISPLAY_TIMEZONE (America/New_York). */
function formatNotifTime(iso: string): { time: string; date: string } {
  try {
    const d = new Date(iso);
    const opts = { timeZone: DISPLAY_TIMEZONE } as const;
    return {
      time: d.toLocaleTimeString("en-US", {
        ...opts,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      date: d.toLocaleDateString("en-US", {
        ...opts,
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
 * Tabs for navigation by category; grouped display; no duplicate labels in content.
 */
export const NotificationsTab: React.FC<NotificationsTabProps> = ({
  notifications,
  loadingMore,
  hasMore,
  onLoadMore,
}) => {
  const [activeTab, setActiveTab] = useState<NotificationCategory | "all">("all");

  const grouped = useMemo(() => {
    const byCategory = new Map<NotificationCategory, NotificationLogItem[]>();
    for (const item of notifications) {
      const config = getNotificationDisplayConfig(item);
      const list = byCategory.get(config.category) ?? [];
      list.push(item);
      byCategory.set(config.category, list);
    }
    return byCategory;
  }, [notifications]);

  const categoryOrder = useMemo(
    () =>
      [...grouped.keys()].sort(
        (a, b) => getCategoryOrder(a) - getCategoryOrder(b)
      ),
    [grouped]
  );

  const displayedCategories =
    activeTab === "all"
      ? categoryOrder
      : categoryOrder.filter((c) => c === activeTab);

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Bell className="size-12 text-border-card mb-4" aria-hidden />
        <p className="font-body text-text-secondary">
          No notifications for this date or filter.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0">
      {/* Category tabs — horizontal scroll on mobile */}
      <div
        className="flex flex-nowrap sm:flex-wrap gap-1 border-b border-border-card pb-3 overflow-x-auto overflow-y-hidden scrollbar-hide -mx-3 sm:mx-0 px-3 sm:px-0"
        role="tablist"
        aria-label="Notification categories"
      >
        {CATEGORY_TABS.map((tab) => {
          const count =
            tab.value === "all"
              ? notifications.length
              : (grouped.get(tab.value as NotificationCategory) ?? []).length;
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.value}`}
              id={`tab-${tab.value}`}
              type="button"
              onClick={() => setActiveTab(tab.value as NotificationCategory | "all")}
              className={`font-body text-sm font-medium px-3 sm:px-4 py-2.5 sm:py-2 rounded-t-card transition-colors focus:outline-none focus:ring-2 focus:ring-accent-green focus:ring-offset-1 shrink-0 min-h-[44px] sm:min-h-0 touch-manipulation ${
                isActive
                  ? "bg-surface-card border border-border-card border-b-0 -mb-px text-accent-green-dark"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-card-alt/50"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`ml-1.5 text-xs ${
                    isActive ? "text-accent-green-dark" : "text-text-secondary"
                  }`}
                >
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content panels */}
      <div className="space-y-6">
      {displayedCategories.map((category) => {
        const items = grouped.get(category) ?? [];
        if (items.length === 0) return null;

        const label = CATEGORY_LABELS[category];
        return (
          <section
            key={category}
            id={`panel-${category}`}
            role="tabpanel"
            aria-labelledby={`tab-${category}`}
          >
            <h2
              id={`notif-cat-${category}`}
              className="font-heading text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3"
            >
              {label}
            </h2>
            <ul className="rounded-card border border-border-card bg-surface-card shadow-card divide-y divide-border-card overflow-hidden">
              {items.map((item) => {
                const config = getNotificationDisplayConfig(item);
                const { time, date } = formatNotifTime(item.created_at);
                return (
                  <li
                    key={item.id}
                    className="p-4 sm:p-5 hover:bg-surface-card-alt/50 transition-colors"
                  >
                    <div className="flex gap-3 sm:gap-4">
                      <div
                        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${config.iconBg} ${config.textColor}`}
                        aria-hidden
                      >
                        {config.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${config.iconBg} ${config.textColor}`}
                          >
                            {config.icon}
                            {config.label}
                          </span>
                          <span className="font-body text-xs text-text-secondary tabular-nums">
                            {time}
                            <span className="ml-1 text-text-secondary/70">
                              {date}
                            </span>
                          </span>
                        </div>

                        {config.summary && (
                          <p
                            className="font-body text-sm text-text-primary whitespace-pre-line"
                            style={{ lineHeight: 1.5 }}
                          >
                            {config.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center justify-center gap-2 font-body text-sm font-medium text-accent-green-dark border border-border-card rounded-card px-5 py-3 sm:py-2.5 bg-surface-card hover:bg-surface-card-alt focus:outline-none focus:ring-2 focus:ring-accent-green disabled:opacity-50 min-h-[48px] sm:min-h-0 touch-manipulation"
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
