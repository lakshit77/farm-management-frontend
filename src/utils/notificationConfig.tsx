/**
 * Notification display config: categories, icons, labels, and human-readable summaries.
 * Replaces raw payload display with fixed templates that highlight useful data.
 */

import React from "react";
import {
  Trophy,
  Clock,
  CheckCircle2,
  Flag,
  XCircle,
  BarChart3,
  PlayCircle,
  ListChecks,
  Timer,
} from "lucide-react";
import type { NotificationLogItem } from "../api";

/** Display category for grouping notifications. */
export type NotificationCategory =
  | "class"
  | "horse"
  | "result"
  | "availability";

/** Display config for a notification. */
export type NotificationDisplayConfig = {
  category: NotificationCategory;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  textColor: string;
  summary: string;
};

const CATEGORY_ORDER: NotificationCategory[] = [
  "class",
  "horse",
  "availability",
  "result",
];

/** Order for sorting notifications by category. */
export function getCategoryOrder(cat: NotificationCategory): number {
  const i = CATEGORY_ORDER.indexOf(cat);
  return i >= 0 ? i : 99;
}

/**
 * Extract time-only (HH:MM:SS) from datetime string for display.
 * Date is redundant since all data is for the same day/event.
 */
function formatTimeOnly(s: string): string {
  const trimmed = s.trim();
  if (!trimmed || trimmed === "—") return "—";
  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx >= 0) return trimmed.slice(spaceIdx + 1); // YYYY-MM-DD HH:MM:SS -> HH:MM:SS
  return trimmed; // Already time-only
}

/**
 * Replace YYYY-MM-DD HH:MM:SS with HH:MM:SS in a string (e.g. stored message).
 * Ensures time-change notifications show time-only even when message was stored with date.
 */
function stripDatesInSummary(text: string): string {
  return text.replace(/\d{4}-\d{2}-\d{2} (\d{2}:\d{2}:\d{2})/g, "$1");
}

/**
 * Build a human-readable summary from payload using fixed templates.
 * Highlights useful data; never shows raw technical keys.
 */
function buildSummaryFromPayload(
  notificationType: string,
  source: string,
  payload: Record<string, unknown> | null
): string {
  if (!payload || typeof payload !== "object") return "";

  const p = payload as Record<string, unknown>;
  const class_name = String(p.class_name ?? "Unknown class");
  const ring_name = String(p.ring_name ?? p.ring ?? "");
  const horse = String(p.horse ?? "Unknown horse");

  switch (notificationType) {
    case "STATUS_CHANGE": {
      const newStatus = String(p.new ?? "");
      const oldStatus = String(p.old ?? "");
      if (newStatus === "Completed") {
        return `${class_name} has finished${ring_name ? ` in ${ring_name}` : ""}.`;
      }
      if (newStatus === "Underway" || newStatus === "In Progress") {
        return `${class_name} has started${ring_name ? ` in ${ring_name}` : ""}.`;
      }
      return oldStatus
        ? `Status changed from ${oldStatus} to ${newStatus} for ${class_name}.`
        : `${class_name}: ${newStatus || "status update"}.`;
    }
    case "TIME_CHANGE": {
      const oldTime = formatTimeOnly(String(p.old ?? "—"));
      const newTime = formatTimeOnly(String(p.new ?? "—"));
      return `${class_name}${ring_name ? ` (${ring_name})` : ""}: time changed from ${oldTime} to ${newTime}.`;
    }
    case "PROGRESS_UPDATE": {
      const completed = p.completed ?? 0;
      const total = p.total ?? 0;
      return `${class_name}${ring_name ? ` (${ring_name})` : ""}: ${completed} of ${total} completed.`;
    }
    case "RESULT": {
      const placing = p.placing ?? "—";
      const prize = p.prize_money ?? p.prize ?? 0;
      return `${horse} placed #${placing} in ${class_name}. Prize: $${prize}`;
    }
    case "HORSE_COMPLETED": {
      const faults = p.faults ?? "—";
      const time_s = p.time_s ?? p.time_one ?? "—";
      const hasNext = p.has_next === true;
      const nextClass = String(p.next_class_name ?? "");
      const freeHours = p.free_hours ?? 0;
      const freeMins = p.free_mins ?? 0;
      const tripResult = `Faults: ${faults} | Time: ${time_s}s`;
      if (hasNext && nextClass) {
        return `${horse} finished ${class_name}. ${tripResult}. Next: ${nextClass} in ${freeHours}h ${freeMins}m.`;
      }
      return `${horse} finished ${class_name}. ${tripResult}. No more classes today.`;
    }
    case "SCRATCHED": {
      return `${horse} was scratched from ${class_name}.`;
    }
    default:
      return "";
  }
}

/**
 * Get display config for a notification item.
 * Uses message when available; otherwise builds summary from payload.
 */
export function getNotificationDisplayConfig(
  item: NotificationLogItem
): NotificationDisplayConfig {
  const { notification_type, source, message, payload } = item;
  const p = (payload as Record<string, unknown>) ?? {};

  // Use message when it exists and is non-empty; otherwise build from payload
  const summary =
    message && message.trim()
      ? message.trim()
      : buildSummaryFromPayload(notification_type, source, payload);

  // Horse availability (Flow 3): distinct from class-monitoring HORSE_COMPLETED
  if (source === "horse_availability" && notification_type === "HORSE_COMPLETED") {
    const label = "Horse availability";
    return {
      category: "availability",
      label,
      icon: <Timer className="size-4" aria-hidden />,
      iconBg: "bg-sky-100",
      textColor: "text-sky-800",
      summary: stripRedundantHeader(summary, label),
    };
  }

  // STATUS_CHANGE: derive label from payload.new
  if (notification_type === "STATUS_CHANGE") {
    const newStatus = String(p.new ?? "");
    const isCompleted = newStatus === "Completed";
    const isStarted =
      newStatus === "Underway" || newStatus === "In Progress";
    const label = isCompleted ? "Class completed" : isStarted ? "Class started" : "Class status";
    return {
      category: "class",
      label,
      icon: isCompleted ? (
        <Flag className="size-4" aria-hidden />
      ) : isStarted ? (
        <PlayCircle className="size-4" aria-hidden />
      ) : (
        <ListChecks className="size-4" aria-hidden />
      ),
      iconBg: isCompleted ? "bg-emerald-100" : "bg-green-100",
      textColor: isCompleted ? "text-emerald-800" : "text-accent-green-dark",
      summary: stripRedundantHeader(summary, label),
    };
  }

  // Base configs by type
  const baseConfigs: Record<
    string,
    Omit<NotificationDisplayConfig, "summary">
  > = {
    TIME_CHANGE: {
      category: "class",
      label: "Time change",
      icon: <Clock className="size-4" aria-hidden />,
      iconBg: "bg-orange-100",
      textColor: "text-orange-700",
    },
    PROGRESS_UPDATE: {
      category: "class",
      label: "Progress update",
      icon: <BarChart3 className="size-4" aria-hidden />,
      iconBg: "bg-blue-100",
      textColor: "text-blue-800",
    },
    RESULT: {
      category: "result",
      label: "Result",
      icon: <Trophy className="size-4" aria-hidden />,
      iconBg: "bg-amber-100",
      textColor: "text-amber-800",
    },
    HORSE_COMPLETED: {
      category: "horse",
      label: "Trip completed",
      icon: <CheckCircle2 className="size-4" aria-hidden />,
      iconBg: "bg-green-100",
      textColor: "text-accent-green-dark",
    },
    SCRATCHED: {
      category: "horse",
      label: "Scratched",
      icon: <XCircle className="size-4" aria-hidden />,
      iconBg: "bg-red-100",
      textColor: "text-red-700",
    },
  };

  const base = baseConfigs[notification_type] ?? {
    category: "class" as NotificationCategory,
    label: notification_type.replace(/_/g, " ").toLowerCase(),
    icon: <ListChecks className="size-4" aria-hidden />,
    iconBg: "bg-gray-100",
    textColor: "text-text-secondary",
  };

  let finalSummary = stripRedundantHeader(summary, base.label);
  if (notification_type === "TIME_CHANGE") {
    finalSummary = stripDatesInSummary(finalSummary);
  }
  return {
    ...base,
    summary: finalSummary,
  };
}

/** Category display labels for section headers. */
export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  class: "Class updates",
  horse: "Horse activity",
  availability: "Horse availability",
  result: "Results",
};

/**
 * Strip redundant header from summary when it duplicates the badge label.
 * E.g. "🟢 Class Started\n\n📋 ..." with label "Class started" → "📋 ..."
 */
export function stripRedundantHeader(summary: string, label: string): string {
  if (!summary?.trim() || !label?.trim()) return summary;
  const lines = summary.split("\n");
  const first = lines[0].trim();
  // Remove common emoji/symbols from start for comparison
  const firstClean = first
    .replace(/^[\s🟢🟡🟠🔵📋📍🐴#️⃣⏰✅❌🏁🏆💰🥇📊]+/g, "")
    .trim();
  const labelNorm = label.toLowerCase().replace(/\s+/g, " ");
  const firstNorm = firstClean.toLowerCase();
  const isRedundant =
    firstNorm === labelNorm ||
    firstNorm.startsWith(labelNorm) ||
    firstNorm.startsWith(labelNorm + " ") ||
    firstNorm.endsWith(" " + labelNorm);
  if (isRedundant) {
    let i = 1;
    while (i < lines.length && lines[i].trim() === "") i++;
    const rest = lines.slice(i).join("\n").trim();
    return rest || summary;
  }
  return summary;
}
