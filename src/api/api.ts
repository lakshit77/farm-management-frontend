/**
 * API constants and definitions.
 *
 * All schedule (and future) API endpoints are defined here. Base URL and
 * USE_MOCK_DATA come from config.ts. When USE_MOCK_DATA is true, callers
 * should return mockResponse instead of calling the real endpoint.
 *
 * Rules:
 * - No hardcoded API URLs outside this file
 * - Each API object: url (or url builder), method, useMockData, mockResponse
 * - Set USE_MOCK_DATA to false in config.ts to use the real backend
 */

import {
  CURRENT_ENVIRONMENT,
  API_BASE_URLS,
  USE_MOCK_DATA,
  API_SECRET,
  type Environment,
} from '../config';

import type { ScheduleViewResponse, NotificationLogResponse, AllEntriesResponse } from './types';

export type {
  ScheduleViewResponse,
  ScheduleViewData,
  ScheduleEvent,
  ScheduleClass,
  ScheduleEntry,
  NotificationLogResponse,
  NotificationLogListData,
  NotificationLogItem,
  AllEntriesResponse,
  AllEntriesListData,
  AllEntryItem,
} from './types';
export type { Environment };
export { CURRENT_ENVIRONMENT, USE_MOCK_DATA };

/** Base API URL for the current environment. */
export const API_BASE_URL = API_BASE_URLS[CURRENT_ENVIRONMENT];

/**
 * Default headers for backend API requests (Authorization: Bearer <API_SECRET>).
 * Use for all fetch() calls to the backend. Pass optional extra headers as needed.
 */
export function getApiHeaders(additionalHeaders?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {};
  if (API_SECRET) {
    headers['Authorization'] = `Bearer ${API_SECRET}`;
  }
  if (additionalHeaders && typeof additionalHeaders === 'object' && !Array.isArray(additionalHeaders)) {
    Object.assign(headers, additionalHeaders);
  }
  return headers;
}

// =============================================================================
// Schedule API
// =============================================================================

/**
 * Schedule View API
 *
 * Purpose: Fetch the daily schedule for a given date (show, events/rings,
 * classes, entries with horse/rider and status).
 *
 * Endpoint: GET /api/v1/schedule/view?date=YYYY-MM-DD
 *
 * Query parameters:
 * - date: ISO date string (YYYY-MM-DD)
 *
 * Response:
 * - status: 1 success, 0 error
 * - message: string
 * - data: { date, show_name, show_id, events[] }
 */
/** Query params for GET /api/v1/schedule/view. */
export type ScheduleViewParams = {
  date: string; // YYYY-MM-DD
  horse_name?: string;
  class_name?: string;
};

export const SCHEDULE_VIEW_API = {
  url: (params: ScheduleViewParams | string): string => {
    const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    // Accept legacy string (date-only) or full params object
    if (typeof params === 'string') {
      return `${base}/api/v1/schedule/view?date=${encodeURIComponent(params)}`;
    }
    const search = new URLSearchParams();
    search.set('date', params.date);
    if (params.horse_name) search.set('horse_name', params.horse_name);
    if (params.class_name) search.set('class_name', params.class_name);
    return `${base}/api/v1/schedule/view?${search.toString()}`;
  },
  method: 'GET' as const,
  useMockData: USE_MOCK_DATA,
  mockResponse: {
    status: 1 as const,
    message: 'success',
    data: {
      date: '2026-02-13',
      show_name: '2026 WEF 6 (#200) CSI3* WCHR IDA Development',
      show_id: '063bec34-444c-4d65-8cf6-7c9972d08195',
      events: [
        {
          id: 'fa1bc5ac-b322-46b3-8c22-724f6b349f71',
          name: 'International Ring',
          ring_number: 1,
          classes: [
            {
              id: '2c322a6d-85cb-43f9-9c93-8988e0c37bf0',
              name: "$667 Amateur Owner Hunter 3'6\" 18-35",
              class_number: '2602',
              sponsor: 'Ritz Carlton Residences, West Palm Beach',
              prize_money: null,
              class_type: 'Hunters',
              entries: [
                {
                  id: '5ad78910-2bd4-42e3-9921-4de363393a96',
                  horse: { id: '1379acf5-00f6-4c28-bf38-d581d3096c80', name: 'CHECKPOINT', status: 'active' },
                  rider: { id: '56596be4-2f27-481a-8b6b-444abd7d61b9', name: 'OWEN GAJOCH' },
                  back_number: '1119',
                  order_of_go: 6,
                  order_total: null,
                  status: 'completed',
                  scratch_trip: false,
                  gone_in: true,
                  estimated_start: '07:33:13',
                  actual_start: '07:33:26',
                  scheduled_date: '2026-02-13',
                  class_status: 'Completed',
                  ring_status: null,
                  total_trips: 21,
                  completed_trips: 21,
                  remaining_trips: 0,
                  placing: 100000,
                  points_earned: '0.00',
                  total_prize_money: '0.00',
                  faults_one: '0.00',
                  time_one: '0.000',
                  disqualify_status_one: null,
                  faults_two: '0.00',
                  time_two: '0.000',
                  disqualify_status_two: null,
                  score1: '80.00',
                  score2: '0.00',
                  score3: '0.00',
                  score4: '0.00',
                  score5: '0.00',
                  score6: '0.00',
                },
                {
                  id: 'e5d19cc0-677c-4e74-96e4-13fa32c0631f',
                  horse: { id: '2257e521-3c23-44c0-b9eb-9e6b1a06078e', name: 'OUTER BANKS', status: 'active' },
                  rider: { id: 'e32f366f-d0cb-4bd3-83cb-df06d4025012', name: 'ANNA KOENIG' },
                  back_number: '1122',
                  order_of_go: 7,
                  order_total: null,
                  status: 'completed',
                  scratch_trip: false,
                  gone_in: true,
                  estimated_start: '07:33:13',
                  actual_start: '07:33:26',
                  scheduled_date: '2026-02-13',
                  class_status: 'Completed',
                  ring_status: null,
                  total_trips: 21,
                  completed_trips: 21,
                  remaining_trips: 0,
                  placing: 100000,
                  points_earned: '0.00',
                  total_prize_money: '0.00',
                  faults_one: '0.00',
                  time_one: '0.000',
                  disqualify_status_one: null,
                  faults_two: '0.00',
                  time_two: '0.000',
                  disqualify_status_two: null,
                  score1: '77.00',
                  score2: '0.00',
                  score3: '0.00',
                  score4: '0.00',
                  score5: '0.00',
                  score6: '0.00',
                },
              ],
            },
            {
              id: 'b53a865d-20ca-404a-8be0-96986e419279',
              name: "$840 Amateur Owner Hunter 3'3\" 18-35",
              class_number: '2628',
              sponsor: 'Adequan',
              prize_money: null,
              class_type: 'Hunters',
              entries: [
                {
                  id: '4c9bd4ac-55db-4d5e-9140-352cf57bacac',
                  horse: { id: 'a5962311-e6b4-485f-9019-16dca14ab5a0', name: 'SABRE', status: 'active' },
                  rider: { id: '8d8e0ae4-2336-47c7-adca-d480f0faf3c5', name: 'DEANA SCHENKEL' },
                  back_number: '1117',
                  order_of_go: 13,
                  order_total: null,
                  status: 'completed',
                  scratch_trip: false,
                  gone_in: true,
                  estimated_start: '09:50:00',
                  actual_start: '09:53:14',
                  scheduled_date: '2026-02-13',
                  class_status: 'Completed',
                  ring_status: null,
                  total_trips: 26,
                  completed_trips: 26,
                  remaining_trips: 0,
                  placing: 100000,
                  points_earned: '0.00',
                  total_prize_money: '0.00',
                  faults_one: '0.00',
                  time_one: '0.000',
                  disqualify_status_one: null,
                  faults_two: '0.00',
                  time_two: '0.000',
                  disqualify_status_two: null,
                  score1: '76.00',
                  score2: '0.00',
                  score3: '0.00',
                  score4: '0.00',
                  score5: '0.00',
                  score6: '0.00',
                },
              ],
            },
          ],
        },
        {
          id: '9f83529b-fdac-4a23-bd1f-f68501d95801',
          name: 'E.R. Mische Grand Hunter',
          ring_number: 2,
          classes: [
            {
              id: '5441d21c-2e7c-4e01-bb01-709ee7596176',
              name: "$100 Large Junior Hunter 3'6\" 16-17 U/S",
              class_number: '2841',
              sponsor: 'Voltaire Design',
              prize_money: null,
              class_type: 'Hunters',
              entries: [
                {
                  id: '5badca9a-a32d-41ce-861f-377463336ae9',
                  horse: { id: '8213b788-bc08-4db4-96e0-05d59896ed89', name: 'URADO SV', status: 'active' },
                  rider: { id: 'bcb10ac4-4c6b-4b3b-9a63-fe0a5507f3c9', name: 'PARKER PEACOCK' },
                  back_number: '4293',
                  order_of_go: 100000,
                  order_total: null,
                  status: 'completed',
                  scratch_trip: false,
                  gone_in: true,
                  estimated_start: '10:45:01',
                  actual_start: '11:03:49',
                  scheduled_date: '2026-02-13',
                  class_status: 'Completed',
                  ring_status: null,
                  total_trips: 26,
                  completed_trips: 26,
                  remaining_trips: 0,
                  placing: 100000,
                  points_earned: '0.00',
                  total_prize_money: '0.00',
                  faults_one: '0.00',
                  time_one: '0.000',
                  disqualify_status_one: null,
                  faults_two: '0.00',
                  time_two: '0.000',
                  disqualify_status_two: null,
                  score1: '0.00',
                  score2: '0.00',
                  score3: '0.00',
                  score4: '0.00',
                  score5: '0.00',
                  score6: '0.00',
                },
              ],
            },
          ],
        },
      ],
      inactive_entries: [
        {
          id: 'inactive-example-uuid',
          horse: { id: 'horse-inactive-id', name: 'Example Horse (No Class)', status: 'inactive' },
          rider: { id: 'rider-inactive-id', name: 'Example Rider' },
          back_number: '—',
          order_of_go: null,
          order_total: null,
          status: 'inactive',
          scratch_trip: false,
          gone_in: false,
          estimated_start: null,
          actual_start: null,
          scheduled_date: '2026-02-13',
          class_status: null,
          ring_status: null,
          total_trips: null,
          completed_trips: null,
          remaining_trips: null,
          placing: null,
          points_earned: null,
          total_prize_money: null,
          faults_one: null,
          time_one: null,
          disqualify_status_one: null,
          faults_two: null,
          time_two: null,
          disqualify_status_two: null,
          score1: null,
          score2: null,
          score3: null,
          score4: null,
          score5: null,
          score6: null,
        },
      ],
      class_monitoring_last_run: 'Wed, 19 Feb 2026, 10:30 AM EST',
    },
  } satisfies ScheduleViewResponse,
} as const;

// =============================================================================
// Daily Schedule API (Flow 1)
// =============================================================================

/**
 * Daily Schedule API (Flow 1 - Morning Sync).
 *
 * Purpose: Trigger the daily schedule sync. Called by n8n daily (e.g. 7:00 AM).
 * Runs Flow 1: fetches show schedule, syncs entries to DB.
 *
 * Endpoint: GET /api/v1/schedule/daily?date=YYYY-MM-DD
 *
 * Query parameters:
 * - date: Optional. ISO date string (YYYY-MM-DD). Default: today UTC.
 *
 * Response:
 * - status: 1 success, 0 error
 * - message: string
 * - data: { summary, ... }
 */
export type DailyScheduleParams = {
  date?: string; // YYYY-MM-DD, optional
};

export const DAILY_SCHEDULE_API = {
  url: (params: DailyScheduleParams = {}): string => {
    const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const search = new URLSearchParams();
    if (params.date) search.set('date', params.date);
    const qs = search.toString();
    return `${base}/api/v1/schedule/daily${qs ? `?${qs}` : ''}`;
  },
  method: 'GET' as const,
  useMockData: USE_MOCK_DATA,
  mockResponse: {
    status: 1 as const,
    message: 'success',
    data: { summary: 'Mock daily schedule completed' },
  },
} as const;

// =============================================================================
// Class Monitor API (Flow 2)
// =============================================================================

/**
 * Class Monitor API (Flow 2 - Class Monitoring).
 *
 * Purpose: Trigger class monitoring. Called by n8n every 10 minutes.
 * Runs Flow 2: fetches active classes, detects changes, updates DB.
 *
 * Endpoint: GET /api/v1/schedule/class-monitor?date=YYYY-MM-DD
 *
 * Query parameters:
 * - date: Optional. ISO date string (YYYY-MM-DD). Default: today UTC.
 *
 * Response:
 * - status: 1 success, 0 error
 * - message: string
 * - data: { summary, changes, alerts, ... }
 */
export type ClassMonitorParams = {
  date?: string; // YYYY-MM-DD, optional
};

export const CLASS_MONITOR_API = {
  url: (params: ClassMonitorParams = {}): string => {
    const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const search = new URLSearchParams();
    if (params.date) search.set('date', params.date);
    const qs = search.toString();
    return `${base}/api/v1/schedule/class-monitor${qs ? `?${qs}` : ''}`;
  },
  method: 'GET' as const,
  useMockData: USE_MOCK_DATA,
  mockResponse: {
    status: 1 as const,
    message: 'success',
    data: { summary: 'Mock class monitoring completed' },
  },
} as const;

// =============================================================================
// Notification log API
// =============================================================================

/** Query params for GET /api/v1/schedule/notifications. */
export type NotificationLogParams = {
  limit?: number;
  offset?: number;
  source?: string;
  notification_type?: string;
  date?: string; // YYYY-MM-DD
  horse_name?: string;
  class_name?: string;
};

/**
 * Notification log API.
 *
 * Endpoint: GET /api/v1/schedule/notifications
 *
 * Query parameters: limit, offset, source, notification_type, date.
 */
export const NOTIFICATIONS_API = {
  url: (params: NotificationLogParams = {}): string => {
    const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const search = new URLSearchParams();
    if (params.limit != null) search.set('limit', String(params.limit));
    if (params.offset != null) search.set('offset', String(params.offset));
    if (params.source != null && params.source !== '') search.set('source', params.source);
    if (params.notification_type != null && params.notification_type !== '')
      search.set('notification_type', params.notification_type);
    if (params.date != null && params.date !== '') search.set('date', params.date);
    if (params.horse_name != null && params.horse_name !== '') search.set('horse_name', params.horse_name);
    if (params.class_name != null && params.class_name !== '') search.set('class_name', params.class_name);
    const qs = search.toString();
    return `${base}/api/v1/schedule/notifications${qs ? `?${qs}` : ''}`;
  },
  method: 'GET' as const,
  useMockData: USE_MOCK_DATA,
  mockResponse: {
    status: 1 as const,
    message: 'success',
    data: {
      notifications: [
        {
          id: 'mock-notif-1',
          farm_id: 'mock-farm-id',
          source: 'class_monitoring',
          notification_type: 'RESULT',
          message: 'OSTWIND 59 placed 1st',
          payload: { class_name: '$150 Green Hunter', prize: 45 },
          entry_id: 'mock-entry-1',
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'mock-notif-2',
          farm_id: 'mock-farm-id',
          source: 'class_monitoring',
          notification_type: 'TIME_CHANGE',
          message: 'Class 1095 time changed 11:30 AM → 11:50 AM',
          payload: { ring: 'International' },
          entry_id: null,
          created_at: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 'mock-notif-3',
          farm_id: 'mock-farm-id',
          source: 'class_monitoring',
          notification_type: 'STATUS_CHANGE',
          message: 'Class 2401 started',
          payload: null,
          entry_id: 'mock-entry-2',
          created_at: new Date(Date.now() - 10800000).toISOString(),
        },
      ],
    },
  } satisfies NotificationLogResponse,
} as const;

// =============================================================================
// All Show Entries API
// =============================================================================

/** Query params for GET /api/v1/entries/all. */
export type AllEntriesParams = {
  show_id?: string;
  horse_name?: string;
  rider_name?: string;
  trainer_name?: string;
  owner_name?: string;
  is_own?: boolean;
  is_selected?: boolean;
  page?: number;
  page_size?: number;
};

/**
 * All Show Entries API.
 *
 * Endpoint: GET /api/v1/entries/all
 *
 * Returns paginated list of all entries for a show with search and filters.
 */
export const ALL_ENTRIES_API = {
  url: (params: AllEntriesParams = {}): string => {
    const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const search = new URLSearchParams();
    if (params.show_id) search.set('show_id', params.show_id);
    if (params.horse_name) search.set('horse_name', params.horse_name);
    if (params.rider_name) search.set('rider_name', params.rider_name);
    if (params.trainer_name) search.set('trainer_name', params.trainer_name);
    if (params.owner_name) search.set('owner_name', params.owner_name);
    if (params.is_own != null) search.set('is_own', String(params.is_own));
    if (params.is_selected != null) search.set('is_selected', String(params.is_selected));
    if (params.page != null) search.set('page', String(params.page));
    if (params.page_size != null) search.set('page_size', String(params.page_size));
    const qs = search.toString();
    return `${base}/api/v1/entries/all${qs ? `?${qs}` : ''}`;
  },
  method: 'GET' as const,
  useMockData: USE_MOCK_DATA,
  mockResponse: {
    status: 1 as const,
    message: 'success',
    data: {
      entries: [],
      total_count: 0,
      page: 1,
      page_size: 50,
      show_id: null,
      show_name: null,
    },
  } satisfies AllEntriesResponse,
} as const;

/**
 * Toggle Entry Selection API.
 *
 * Endpoint: PATCH /api/v1/entries/{entryId}/select?selected={boolean}
 *
 * Selects or unselects an entry for monitoring.
 */
export const TOGGLE_ENTRY_API = {
  url: (entryId: string, selected: boolean): string => {
    const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    return `${base}/api/v1/entries/${encodeURIComponent(entryId)}/select?selected=${selected}`;
  },
  method: 'PATCH' as const,
} as const;

/**
 * Sync All Entries API.
 *
 * Endpoint: POST /api/v1/entries/sync-all
 *
 * Triggers the all-show-entries sync from Wellington API.
 */
export const SYNC_ALL_ENTRIES_API = {
  url: (): string => {
    const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    return `${base}/api/v1/entries/sync-all`;
  },
  method: 'POST' as const,
} as const;
