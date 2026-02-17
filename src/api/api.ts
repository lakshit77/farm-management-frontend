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

import type { ScheduleViewResponse } from './types';

export type { ScheduleViewResponse, ScheduleViewData, ScheduleEvent, ScheduleClass, ScheduleEntry } from './types';
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
export const SCHEDULE_VIEW_API = {
  url: (date: string): string => {
    const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    return `${base}/api/v1/schedule/view?date=${encodeURIComponent(date)}`;
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
    },
  } satisfies ScheduleViewResponse,
} as const;
