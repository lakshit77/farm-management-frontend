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
  { value: "class", label: "Class" },
  { value: "horse", label: "Horse" },
  { value: "availability", label: "Avail." },
  { value: "result", label: "Results" },
];

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

interface MobileNotificationsTabProps {
  notifications: NotificationLogItem[];
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export const MobileNotificationsTab: React.FC<MobileNotificationsTabProps> = ({
  notifications,
  loadingMore,
  hasMore,
  onLoadMore,
}) => {
  const [activeTab, setActiveTab] = useState<NotificationCategory | "all">(
    "all"
  );

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
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <Bell className="size-10 text-border-card mb-3" aria-hidden />
        <p className="font-body text-sm text-text-secondary">
          No notifications for this date.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-2">
      {/* Category pills */}
      <div
        className="flex gap-1 overflow-x-auto scrollbar-hide -mx-3 px-3 py-1"
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
              type="button"
              aria-selected={isActive}
              onClick={() =>
                setActiveTab(tab.value as NotificationCategory | "all")
              }
              className={`shrink-0 px-3 py-2 rounded-full font-body text-xs font-medium transition-colors touch-manipulation min-h-[36px] ${
                isActive
                  ? "bg-accent-green text-white"
                  : "bg-surface-card border border-border-card text-text-secondary active:bg-surface-card-alt"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`ml-1 ${isActive ? "text-white/80" : "text-text-secondary/70"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications list */}
      {displayedCategories.map((category) => {
        const items = grouped.get(category) ?? [];
        if (items.length === 0) return null;
        const label = CATEGORY_LABELS[category];

        return (
          <section key={category}>
            <h2 className="font-heading text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2 px-0.5">
              {label}
            </h2>
            <div className="rounded-xl border border-border-card bg-surface-card overflow-hidden divide-y divide-border-card/60">
              {items.map((item) => {
                const config = getNotificationDisplayConfig(item);
                const { time, date } = formatNotifTime(item.created_at);
                return (
                  <div
                    key={item.id}
                    className="flex gap-2.5 px-3 py-2.5"
                  >
                    <div
                      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${config.iconBg} ${config.textColor}`}
                      aria-hidden
                    >
                      {React.cloneElement(config.icon as React.ReactElement, {
                        className: "size-3.5",
                      })}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span
                          className={`text-[10px] font-medium ${config.textColor}`}
                        >
                          {config.label}
                        </span>
                        <span className="font-body text-[10px] text-text-secondary tabular-nums shrink-0">
                          {time} · {date}
                        </span>
                      </div>
                      {config.summary && (
                        <p className="font-body text-xs text-text-primary leading-relaxed">
                          {config.summary}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {hasMore && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center justify-center gap-2 font-body text-xs font-medium text-accent-green-dark border border-border-card rounded-full px-5 py-2.5 bg-surface-card active:bg-surface-card-alt disabled:opacity-50 min-h-[44px] touch-manipulation"
          >
            {loadingMore ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />{" "}
                Loading...
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
