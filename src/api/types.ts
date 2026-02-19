/**
 * API response and domain types for schedule and related endpoints.
 * Kept in a separate file so they can be imported by api.ts and by UI code.
 */

/** Response shape for GET schedule/view (status + message + data). */
export type ScheduleViewResponse = {
  status: 1 | 0;
  message: string;
  data: ScheduleViewData;
};

/** Inner payload: date, show info, events (rings) with classes and entries, and inactive entries. */
export type ScheduleViewData = {
  date: string;
  show_name: string;
  show_id: string;
  events: ScheduleEvent[];
  /** Entries for horses in "my entries" but not in any class (status: inactive). */
  inactive_entries?: ScheduleEntry[];
  /** When class monitoring last ran (America/New_York), e.g. "Wed, 19 Feb 2026, 10:30 AM EST". */
  class_monitoring_last_run?: string | null;
};

export type ScheduleEvent = {
  id: string;
  name: string;
  ring_number: number;
  classes: ScheduleClass[];
};

export type ScheduleClass = {
  id: string;
  name: string;
  class_number: string;
  sponsor: string | null;
  prize_money: number | null;
  class_type: string;
  entries: ScheduleEntry[];
};

export type ScheduleEntry = {
  id: string;
  horse: { id: string; name: string; status: string };
  rider: { id: string; name: string } | null;
  back_number: string;
  order_of_go: number | null;
  order_total: number | null;
  status: string;
  scratch_trip: boolean;
  gone_in: boolean;
  estimated_start: string | null;
  actual_start: string | null;
  scheduled_date: string;
  class_status: string | null;
  ring_status: string | null;
  total_trips: number | null;
  completed_trips: number | null;
  remaining_trips: number | null;
  placing: number | null;
  points_earned: string | null;
  total_prize_money: string | null;
  faults_one: string | null;
  time_one: string | null;
  disqualify_status_one: string | null;
  faults_two: string | null;
  time_two: string | null;
  disqualify_status_two: string | null;
  score1: string | null;
  score2: string | null;
  score3: string | null;
  score4: string | null;
  score5: string | null;
  score6: string | null;
};

// =============================================================================
// Notification log API
// =============================================================================

/** Single notification log entry from GET /api/v1/schedule/notifications. */
export type NotificationLogItem = {
  id: string;
  farm_id: string;
  source: string;
  notification_type: string;
  message: string | null;
  payload: Record<string, unknown> | null;
  entry_id: string | null;
  created_at: string; // ISO datetime
};

/** Inner payload for notifications list response. */
export type NotificationLogListData = {
  notifications: NotificationLogItem[];
};

/** Response shape for GET schedule/notifications (status + message + data). */
export type NotificationLogResponse = {
  status: 1 | 0;
  message: string;
  data: NotificationLogListData;
};
