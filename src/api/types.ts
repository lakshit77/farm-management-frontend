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

/** Inner payload: date, show info, and events (rings) with classes and entries. */
export type ScheduleViewData = {
  date: string;
  show_name: string;
  show_id: string;
  events: ScheduleEvent[];
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
  rider: { id: string; name: string };
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
