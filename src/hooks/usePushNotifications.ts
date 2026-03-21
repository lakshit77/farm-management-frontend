/**
 * usePushNotifications hook.
 *
 * Manages the full lifecycle of Web Push notification subscriptions:
 *   - Two-step permission flow (soft prompt → browser dialog)
 *   - Subscribe / unsubscribe per device
 *   - Per-user preference management (all devices share preferences)
 *   - localStorage-based prompt state tracking (re-ask after 3 days)
 *   - iOS standalone mode detection
 *
 * Usage:
 *   const push = usePushNotifications({ userId, farmId, accessToken });
 *   push.subscribe();          // trigger two-step flow
 *   push.unsubscribe();        // deactivate this device
 *   push.dismissPrompt();      // not now — re-ask in 3 days
 *   push.preferences           // current category toggle values
 *   push.updatePreferences({ results: false });  // update backend prefs
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE_URL } from "../api/api";

// ── Constants ──────────────────────────────────────────────────────────────────

const LS_DISMISSED_AT = "push_dismissed_at";
const LS_BLOCKED = "push_blocked";
const LS_SUBSCRIBED = "push_subscribed";
const REDISMISS_DAYS = 3;

// ── Types ──────────────────────────────────────────────────────────────────────

export type PermissionState = "default" | "granted" | "denied";

/** Derived state of the soft-prompt display logic. */
export type PromptState =
  | "never_asked"        // no localStorage entry; show prompt
  | "dismissed_recently" // dismissed < 3 days ago; hide prompt
  | "dismissed_ready"    // dismissed ≥ 3 days ago; show prompt again
  | "granted"            // browser permission is already granted
  | "blocked";           // browser permission is denied

export interface NotificationPreferences {
  chat_all_team: boolean;
  chat_admin: boolean;
  chat_dm: boolean;
  class_status: boolean;
  time_changes: boolean;
  results: boolean;
  horse_completed: boolean;
  scratched: boolean;
  progress_updates: boolean;
  morning_summary: boolean;
}

export type PartialPreferences = Partial<NotificationPreferences>;

export interface PushNotificationsState {
  /** True when PushManager and serviceWorker APIs are available in this browser. */
  isSupported: boolean;
  /** True when the PWA is running in standalone mode (added to home screen). */
  isStandalone: boolean;
  /** Current browser notification permission state. */
  permissionState: PermissionState;
  /** True when this device has an active push subscription stored in the backend. */
  isSubscribed: boolean;
  /** Derived prompt display logic state. */
  promptState: PromptState;
  /** True while subscribe/unsubscribe is in progress. */
  isLoading: boolean;
  /** Error message from the last failed operation, if any. */
  error: string | null;
  /** Current per-user notification category preferences. */
  preferences: NotificationPreferences | null;
  /** True while preferences are loading from the backend. */
  prefsLoading: boolean;
  /** Subscribe this device to push notifications (triggers browser dialog if needed). */
  subscribe: () => Promise<void>;
  /** Deactivate push notifications for this device. */
  unsubscribe: () => Promise<void>;
  /** Dismiss the soft prompt and re-ask after 3 days. */
  dismissPrompt: () => void;
  /** Update one or more notification category preferences. */
  updatePreferences: (partial: PartialPreferences) => Promise<void>;
  /** Fetch preferences from the backend (called automatically on mount). */
  refetchPreferences: () => Promise<void>;
}

interface UsePushNotificationsOptions {
  /** Supabase user ID (UUID string). Required for API calls. */
  userId: string | null;
  /** Farm UUID. Required to store subscriptions scoped to the farm. */
  farmId: string | null;
  /** Supabase access token (JWT). Used as Authorization: Bearer for push API calls. */
  accessToken: string | null;
}

// ── VAPID key cache (module-level — fetched once per session) ─────────────────

let _cachedVapidKey: string | null = null;

async function getVapidKey(): Promise<string> {
  if (_cachedVapidKey) return _cachedVapidKey;
  const resp = await fetch(`${API_BASE_URL}/api/v1/push/vapid-public-key`);
  if (!resp.ok) throw new Error("Failed to fetch VAPID public key");
  const json = await resp.json();
  _cachedVapidKey = json.data?.public_key ?? "";
  if (!_cachedVapidKey) throw new Error("VAPID public key is empty");
  return _cachedVapidKey;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  /** Convert a URL-safe base64 string to an ArrayBuffer (required by pushManager.subscribe). */
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    arr[i] = rawData.charCodeAt(i);
  }
  return arr.buffer as ArrayBuffer;
}

function detectStandalone(): boolean {
  /** True when running as a standalone PWA (added to home screen). */
  if (typeof window === "undefined") return false;
  // iOS Safari sets navigator.standalone
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  // Android/desktop Chrome sets display-mode: standalone
  return window.matchMedia("(display-mode: standalone)").matches;
}

function derivePromptState(permission: PermissionState): PromptState {
  /** Compute prompt state from permission + localStorage. */
  if (permission === "granted") return "granted";
  if (permission === "denied" || localStorage.getItem(LS_BLOCKED) === "true") return "blocked";

  const dismissedAt = localStorage.getItem(LS_DISMISSED_AT);
  if (!dismissedAt) return "never_asked";

  const dismissedMs = parseInt(dismissedAt, 10);
  if (isNaN(dismissedMs)) return "never_asked";

  const daysSince = (Date.now() - dismissedMs) / (1000 * 60 * 60 * 24);
  return daysSince >= REDISMISS_DAYS ? "dismissed_ready" : "dismissed_recently";
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePushNotifications({
  userId,
  farmId,
  accessToken,
}: UsePushNotificationsOptions): PushNotificationsState {
  const isSupported =
    typeof window !== "undefined" &&
    "PushManager" in window &&
    "serviceWorker" in navigator;

  const [isStandalone] = useState<boolean>(detectStandalone);
  const [permissionState, setPermissionState] = useState<PermissionState>(
    () => (isSupported ? (Notification.permission as PermissionState) : "default")
  );
  const [isSubscribed, setIsSubscribed] = useState<boolean>(
    () => localStorage.getItem(LS_SUBSCRIBED) === "true"
  );
  const [promptState, setPromptState] = useState<PromptState>(() =>
    derivePromptState(isSupported ? (Notification.permission as PermissionState) : "default")
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(false);

  // Keep a ref so callbacks always read the latest token even when mid-flight.
  // This prevents stale closure bugs where an in-progress async op uses an
  // old accessToken after auth state changes between awaits.
  const accessTokenRef = useRef<string | null>(accessToken);
  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  const getAuthHeader = useCallback((): Record<string, string> => {
    const token = accessTokenRef.current;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // ── Fetch preferences ────────────────────────────────────────────────────────

  const refetchPreferences = useCallback(async () => {
    if (!userId || !farmId || !accessToken) return;
    setPrefsLoading(true);
    try {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/push/preferences?farm_id=${farmId}`,
        { headers: getAuthHeader() }
      );
      if (resp.ok) {
        const json = await resp.json();
        setPreferences(json.data ?? null);
      }
    } catch (err) {
      console.error("[Push] Failed to fetch preferences:", err);
    } finally {
      setPrefsLoading(false);
    }
  }, [userId, farmId, accessToken, getAuthHeader]);

  useEffect(() => {
    if (userId && farmId && accessToken) {
      void refetchPreferences();
    }
  }, [userId, farmId, accessToken, refetchPreferences]);

  // ── Subscribe ────────────────────────────────────────────────────────────────

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError("Push notifications are not supported in this browser.");
      return;
    }
    if (!userId || !farmId || !accessToken) {
      setError("You must be logged in to enable notifications.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Request browser permission
      const permission = await Notification.requestPermission();
      setPermissionState(permission as PermissionState);
      setPromptState(derivePromptState(permission as PermissionState));

      if (permission !== "granted") {
        localStorage.setItem(LS_BLOCKED, "true");
        setError("Notifications were blocked. Enable them in your phone settings.");
        return;
      }

      // Step 2: Subscribe via PushManager
      const registration = await navigator.serviceWorker.ready;
      const vapidKey = await getVapidKey();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const subJson = subscription.toJSON();
      const keys = subJson.keys ?? {};

      // Step 3: Save subscription to backend
      const resp = await fetch(`${API_BASE_URL}/api/v1/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          p256dh: keys.p256dh ?? "",
          auth: keys.auth ?? "",
          farm_id: farmId,
          user_agent: navigator.userAgent.substring(0, 200),
        }),
      });

      if (!resp.ok) throw new Error(`Backend subscribe failed: ${resp.status}`);

      localStorage.setItem(LS_SUBSCRIBED, "true");
      localStorage.removeItem(LS_BLOCKED);
      setIsSubscribed(true);
      setPromptState("granted");

      // Auto-create preferences row if not yet fetched
      if (!preferences) {
        await refetchPreferences();
      }
    } catch (err) {
      console.error("[Push] subscribe error:", err);
      setError("Failed to enable notifications. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, userId, farmId, accessToken, preferences, refetchPreferences, getAuthHeader]);

  // ── Unsubscribe ──────────────────────────────────────────────────────────────

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !accessToken) return;
    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        // Unsubscribe from browser
        await subscription.unsubscribe();
        // Deactivate in backend
        await fetch(`${API_BASE_URL}/api/v1/push/subscribe`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", ...getAuthHeader() },
          body: JSON.stringify({ endpoint }),
        });
      }

      localStorage.setItem(LS_SUBSCRIBED, "false");
      setIsSubscribed(false);
      setPermissionState(Notification.permission as PermissionState);
      setPromptState(derivePromptState(Notification.permission as PermissionState));
    } catch (err) {
      console.error("[Push] unsubscribe error:", err);
      setError("Failed to disable notifications. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, accessToken, getAuthHeader]);

  // ── Dismiss prompt ───────────────────────────────────────────────────────────

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(LS_DISMISSED_AT, String(Date.now()));
    setPromptState("dismissed_recently");
  }, []);

  // ── Update preferences ───────────────────────────────────────────────────────

  const updatePreferences = useCallback(
    async (partial: PartialPreferences) => {
      if (!userId || !farmId || !accessToken) return;

      // Optimistic update
      setPreferences((prev) => (prev ? { ...prev, ...partial } : null));

      try {
        const resp = await fetch(
          `${API_BASE_URL}/api/v1/push/preferences?farm_id=${farmId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...getAuthHeader() },
            body: JSON.stringify(partial),
          }
        );
        if (resp.ok) {
          const json = await resp.json();
          setPreferences(json.data ?? null);
        } else {
          // Revert on failure
          await refetchPreferences();
        }
      } catch (err) {
        console.error("[Push] updatePreferences error:", err);
        await refetchPreferences();
      }
    },
    [userId, farmId, accessToken, refetchPreferences, getAuthHeader]
  );

  return {
    isSupported,
    isStandalone,
    permissionState,
    isSubscribed,
    promptState,
    isLoading,
    error,
    preferences,
    prefsLoading,
    subscribe,
    unsubscribe,
    dismissPrompt,
    updatePreferences,
    refetchPreferences,
  };
}
