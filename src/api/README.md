# API layer

- **types.ts** – TypeScript types for API responses (e.g. `ScheduleViewResponse`, `ScheduleViewData`, `ScheduleEvent`, `ScheduleClass`, `ScheduleEntry`). Import from `./api` or `./api/types`.
- **api.ts** – Defines `SCHEDULE_VIEW_API` (GET `/api/v1/schedule/view?date=...`). Uses `USE_MOCK_DATA` from `config.ts`; when true, use `mockResponse` (defined inline in this file) instead of calling the backend.
- **config.ts** (in `src/`) – `API_BASE_URLS.uat` = localhost, `API_BASE_URLS.production` = to be set; `USE_MOCK_DATA` toggles mock vs real calls. `API_SECRET` is read from `VITE_API_SECRET` and sent as `Authorization: Bearer <secret>` on all backend requests via `getApiHeaders()`.