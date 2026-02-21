import React, { useState, useCallback, useEffect, useContext, useMemo } from "react";
import { RefreshCw, Loader2, Filter, X, AlertCircle, Calendar } from "lucide-react";
import { Button } from "../components";
import { HeaderLabelContext } from "../contexts/HeaderLabelContext";
import {
  NOTIFICATIONS_API,
  getApiHeaders,
  type NotificationLogItem,
  type NotificationLogParams,
} from "../api";
import {
  getNotificationDisplayConfig,
  getCategoryOrder,
  CATEGORY_LABELS,
  type NotificationCategory,
} from "../utils/notificationConfig";
import { DISPLAY_TIMEZONE } from "../config";

const PAGE_SIZE = 50;

const SOURCE_OPTIONS = [
  { value: "", label: "All sources" },
  { value: "class_monitoring", label: "Class monitoring" },
  { value: "horse_availability", label: "Horse availability" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "STATUS_CHANGE", label: "Class status" },
  { value: "TIME_CHANGE", label: "Time change" },
  { value: "PROGRESS_UPDATE", label: "Progress update" },
  { value: "RESULT", label: "Result" },
  { value: "HORSE_COMPLETED", label: "Horse completed / Availability" },
  { value: "SCRATCHED", label: "Scratched" },
];

/** Format ISO datetime to time-only (e.g. 10:47 AM) in DISPLAY_TIMEZONE (America/New_York). */
function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      timeZone: DISPLAY_TIMEZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

/** Format ISO datetime to short date in DISPLAY_TIMEZONE (America/New_York). */
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      timeZone: DISPLAY_TIMEZONE,
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

/** Returns today's date as YYYY-MM-DD. */
function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Notification log view: list of notifications with filters (source, type),
 * single date (like Schedule), refresh, and load more.
 */
export function NotificationLogView(): React.ReactElement {
  const [notifications, setNotifications] = useState<NotificationLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<string>(() => getTodayStr());
  const [source, setSource] = useState<string>("");
  const [notificationType, setNotificationType] = useState<string>("");
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const buildParams = useCallback(
    (overrides: { offset?: number; limit?: number } = {}): NotificationLogParams => ({
      limit: PAGE_SIZE,
      offset: overrides.offset ?? 0,
      source: source || undefined,
      notification_type: notificationType || undefined,
      date: date || undefined,
      ...overrides,
    }),
    [source, notificationType, date]
  );

  const fetchNotifications = useCallback(
    async (isLoadMore: boolean): Promise<void> => {
      const currentOffset = isLoadMore ? offset : 0;
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        if (NOTIFICATIONS_API.useMockData) {
          await new Promise((r) => setTimeout(r, 400));
          const res = NOTIFICATIONS_API.mockResponse;
          if (res.status !== 1) {
            setError(res.message || "Unknown error");
            if (!isLoadMore) setNotifications([]);
            return;
          }
          const list = res.data.notifications;
          // Mock: only return items for first page (offset 0)
          const start = currentOffset;
          const chunk = start < list.length ? list.slice(start, start + PAGE_SIZE) : [];
          if (isLoadMore) {
            setNotifications((prev) => [...prev, ...chunk]);
            setHasMore(chunk.length === PAGE_SIZE);
          } else {
            setNotifications(chunk);
            setHasMore(list.length >= PAGE_SIZE);
          }
          setOffset(isLoadMore ? currentOffset + chunk.length : chunk.length);
          return;
        }

        const url = NOTIFICATIONS_API.url(buildParams({ offset: currentOffset, limit: PAGE_SIZE }));
        const response = await fetch(url, { headers: getApiHeaders() });
        const json = await response.json();
        if (json.status !== 1) {
          setError(json.message || "Unknown error");
          if (!isLoadMore) setNotifications([]);
          return;
        }
        const list = (json.data?.notifications ?? []) as NotificationLogItem[];
        if (isLoadMore) {
          setNotifications((prev) => [...prev, ...list]);
          setHasMore(list.length === PAGE_SIZE);
        } else {
          setNotifications(list);
          setHasMore(list.length === PAGE_SIZE);
        }
        setOffset(isLoadMore ? currentOffset + list.length : list.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
        if (!isLoadMore) setNotifications([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [offset, buildParams]
  );

  const loadInitial = useCallback(() => {
    setOffset(0);
    fetchNotifications(false);
  }, [fetchNotifications]);

  const loadMore = useCallback(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  useEffect(() => {
    setOffset(0);
    fetchNotifications(false);
  }, [source, notificationType, date]); // eslint-disable-line react-hooks/exhaustive-deps -- refetch when filters/date change; fetchNotifications uses latest buildParams

  const { setHeaderLabel } = useContext(HeaderLabelContext);
  useEffect(() => {
    setHeaderLabel("Notification log");
    return () => setHeaderLabel(null);
  }, [setHeaderLabel]);

  const hasActiveFilters = source !== "" || notificationType !== "";
  const clearFilters = (): void => {
    setSource("");
    setNotificationType("");
  };

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

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Toolbar: date, filters, refresh (same pattern as Schedule) */}
        <div className="mb-6 rounded-card border border-border-card bg-surface-card shadow-card overflow-hidden">
          <div className="flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-body text-sm font-medium text-text-primary flex items-center gap-1.5">
                  <Calendar className="size-4 text-text-secondary" aria-hidden /> Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-40 font-body text-sm text-text-primary border border-border-card rounded-card px-3 py-2.5 bg-surface-card focus:outline-none focus:ring-2 focus:ring-accent-green"
                />
              </div>
              <div className="pb-0.5">
                <Button onClick={loadInitial} disabled={loading}>
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden /> Loading…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <RefreshCw className="size-4" aria-hidden /> Refresh
                    </span>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wide flex items-center gap-1.5">
                <Filter className="size-3.5" aria-hidden /> Filters
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-medium text-accent-green-dark hover:text-accent-green focus:outline-none focus:underline inline-flex items-center gap-1"
                >
                  <X className="size-3.5" aria-hidden /> Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="sr-only">Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="font-body text-sm text-text-primary border border-border-card rounded-card px-3 py-2.5 bg-surface-card focus:outline-none focus:ring-2 focus:ring-accent-green min-w-[180px]"
                >
                  {SOURCE_OPTIONS.map((opt) => (
                    <option key={opt.value || "all"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="sr-only">Notification type</label>
                <select
                  value={notificationType}
                  onChange={(e) => setNotificationType(e.target.value)}
                  className="font-body text-sm text-text-primary border border-border-card rounded-card px-3 py-2.5 bg-surface-card focus:outline-none focus:ring-2 focus:ring-accent-green min-w-[180px]"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value || "all"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-card border border-red-200 bg-red-50 p-4 flex items-center gap-3">
            <AlertCircle className="size-5 text-red-600 shrink-0" aria-hidden />
            <p className="font-body text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* List */}
        <div className="rounded-card border border-border-card bg-surface-card shadow-card overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border-card">
            <h2 className="font-heading text-lg font-semibold text-text-primary">Notifications</h2>
          </div>
          <div className="min-h-[200px]">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-8 animate-spin text-text-secondary" aria-hidden />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-16 text-center">
                <p className="font-body text-text-secondary">No notifications for this date.</p>
              </div>
            ) : (
              <div className="divide-y divide-border-card">
                {categoryOrder.map((category) => {
                  const items = grouped.get(category) ?? [];
                  if (items.length === 0) return null;
                  const label = CATEGORY_LABELS[category];
                  return (
                    <div key={category} className="first:border-t-0">
                      <div className="px-4 sm:px-5 py-2 bg-surface-card-alt/50 border-b border-border-card">
                        <h3 className="font-heading text-xs font-semibold text-text-secondary uppercase tracking-wide">
                          {label}
                        </h3>
                      </div>
                      <ul aria-label={`${label} notifications`}>
                        {items.map((item) => {
                          const config = getNotificationDisplayConfig(item);
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
                                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                    <span
                                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${config.iconBg} ${config.textColor}`}
                                    >
                                      {config.icon}
                                      {config.label}
                                    </span>
                                    <span className="font-body text-sm text-text-secondary">
                                      {formatTime(item.created_at)}
                                      <span className="ml-1 text-text-secondary/80">
                                        {formatDate(item.created_at)}
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
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && notifications.length > 0 && hasMore && (
              <div className="p-4 sm:p-5 border-t border-border-card flex justify-center">
                <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden /> Loading…
                    </span>
                  ) : (
                    "Load more"
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
