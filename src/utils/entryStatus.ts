/**
 * Shared helpers for deriving entry/class status from schedule data.
 * Used by dashboard filters and tabs for consistent status filtering and display.
 */

import type { ScheduleEntry } from "../api";

/** Simple status kind for an entry: completed, active (underway), upcoming (not started), or inactive. */
export type EntryStatusKind = "completed" | "active" | "upcoming" | "inactive";

/**
 * Derives a simple status for an entry for colour-coding and filtering.
 * Uses entry.status, entry.class_status, and entry.gone_in.
 */
export function entryStatusKind(entry: ScheduleEntry): EntryStatusKind {
  const s = (entry.status ?? "").toLowerCase();
  if (s === "inactive") return "inactive";
  const cs = (entry.class_status ?? entry.status ?? "").toLowerCase();
  if (cs.includes("completed") || entry.gone_in) return "completed";
  if (cs.includes("underway") || cs.includes("in progress")) return "active";
  return "upcoming";
}

/** Value for the dashboard status filter dropdown (empty = all). */
export type StatusFilterValue = "" | EntryStatusKind;
