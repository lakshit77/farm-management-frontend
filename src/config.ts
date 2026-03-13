/**
 * Application configuration.
 *
 * Environment for API: production (live) or uat (User Acceptance Testing / local).
 * UAT uses localhost; production URL to be added later.
 */

/** Environment for API: production (live) or uat (User Acceptance Testing). */
export type Environment = 'production' | 'uat';

/** Current active environment. Change this to switch the API base URL for all endpoints. */
export const CURRENT_ENVIRONMENT: Environment = 'uat';

/**
 * API base URLs per environment.
 * Production: use VITE_API_BASE_URL in .env / Vercel so the backend is HTTPS (required when frontend is on HTTPS to avoid mixed-content blocking).
 */
const _productionBaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'https://api.aibolt.ai';

export const API_BASE_URLS: Record<Environment, string> = {
  uat: 'http://localhost:8000',
  production: _productionBaseUrl,
};

/** Use mock data instead of real API calls when true. Set to false for real backend. */
export const USE_MOCK_DATA = false;

/**
 * Display timezone for all dates and times in the UI (e.g. notification log, last run).
 * Must be an IANA timezone name. America/New_York is used for Wellington FL and consistent ET display.
 */
export const DISPLAY_TIMEZONE = "America/New_York";

/** Default API secret when VITE_API_SECRET is not set. Used for backend Authorization header. */
// export const DEFAULT_API_SECRET = 'lakshit';
export const DEFAULT_API_SECRET = 'n8n-secret';

/**
 * API secret for backend authorization (Bearer token).
 * Uses VITE_API_SECRET when set; otherwise falls back to DEFAULT_API_SECRET.
 * Sent as Authorization: Bearer <value> on all backend API requests.
 */
export const API_SECRET: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_SECRET) ||
  DEFAULT_API_SECRET;
