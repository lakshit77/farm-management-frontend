/**
 * Public API surface. Re-export all endpoint definitions and types.
 */

export {
  API_BASE_URL,
  CURRENT_ENVIRONMENT,
  USE_MOCK_DATA,
  getApiHeaders,
  SCHEDULE_VIEW_API,
  NOTIFICATIONS_API,
  type Environment,
  type ScheduleViewResponse,
  type ScheduleViewData,
  type ScheduleEvent,
  type ScheduleClass,
  type ScheduleEntry,
  type NotificationLogResponse,
  type NotificationLogListData,
  type NotificationLogItem,
  type NotificationLogParams,
} from './api';
