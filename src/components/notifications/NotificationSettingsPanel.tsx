/**
 * NotificationSettingsPanel — full-page notification settings screen.
 *
 * Two levels of control:
 *   1. Master toggle (per-device) — calls subscribe() / unsubscribe()
 *      Stored in push_subscriptions.is_active in the backend.
 *
 *   2. Per-category toggles (per-user, all devices share them) —
 *      calls PUT /api/v1/push/preferences on the backend.
 *      Greyed out and non-interactive when master toggle is OFF.
 *
 * When the browser permission is "denied", the master toggle is replaced
 * with a static label pointing the user to their OS notification settings.
 */

import React from "react";
import {
  Bell,
  BellOff,
  Trophy,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart2,
  Sun,
  Users,
  Shield,
  MessageSquare,
  Loader2,
  ExternalLink,
} from "lucide-react";
import type {
  PushNotificationsState,
  NotificationPreferences,
  PartialPreferences,
} from "../../hooks/usePushNotifications";

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  icon,
  label,
  description,
  checked,
  disabled,
  onChange,
}) => (
  <div
    className={`flex items-center gap-3 py-3 ${disabled ? "opacity-40 pointer-events-none" : ""}`}
  >
    <span className="size-8 rounded-full bg-background-primary flex items-center justify-center shrink-0 text-text-secondary">
      {icon}
    </span>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-text-primary truncate">{label}</p>
      {description && (
        <p className="text-xs text-text-secondary mt-0.5 truncate">{description}</p>
      )}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`Toggle ${label}`}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green-dark ${
        checked ? "bg-accent-green-dark" : "bg-border-card"
      }`}
    >
      <span
        className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  </div>
);

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <div className="mb-1">
    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-1 py-2">
      {title}
    </p>
    <div className="bg-surface-card border border-border-card rounded-xl px-4 divide-y divide-border-card">
      {children}
    </div>
  </div>
);

interface NotificationSettingsPanelProps {
  push: PushNotificationsState;
  onClose: () => void;
}

export const NotificationSettingsPanel: React.FC<NotificationSettingsPanelProps> = ({
  push,
  onClose,
}) => {
  const {
    isSupported,
    isStandalone,
    permissionState,
    isSubscribed,
    isLoading,
    error,
    preferences,
    prefsLoading,
    subscribe,
    unsubscribe,
    updatePreferences,
  } = push;

  function handleMasterToggle(newValue: boolean) {
    if (newValue) {
      void subscribe();
    } else {
      void unsubscribe();
    }
  }

  function handlePrefToggle(key: keyof NotificationPreferences, value: boolean) {
    void updatePreferences({ [key]: value } as PartialPreferences);
  }

  const categoryDisabled = !isSubscribed || prefsLoading;

  // ── Not supported ──────────────────────────────────────────────────────────
  if (!isSupported) {
    return (
      <div className="flex flex-col h-full bg-background-primary">
        <Header onClose={onClose} />
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 text-center gap-3">
          <BellOff className="size-10 text-text-secondary opacity-50" />
          <p className="text-sm text-text-secondary">
            Push notifications are not supported in this browser.
          </p>
          {!isStandalone && (
            <p className="text-xs text-text-secondary">
              Add this app to your Home Screen and open it from there to enable notifications.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background-primary">
      <Header onClose={onClose} />

      {/* min-h-0 is required on a flex-1 child to correctly constrain the
          scroll region — without it the div grows beyond the flex container
          causing scroll to get stuck. Bottom padding clears the safe area. */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" style={{ paddingBottom: "env(safe-area-inset-bottom, 1rem)" }}>
        <div className="px-4 pt-4 space-y-4 pb-6">

          {/* Master toggle section */}
          <Section title="Push Notifications">
            {permissionState === "denied" ? (
              <div className="py-3 flex items-center gap-3">
                <span className="size-8 rounded-full bg-background-primary flex items-center justify-center shrink-0">
                  <BellOff className="size-4 text-warm-orange-brown" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    Notifications blocked
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Open your phone settings to re-enable.
                  </p>
                </div>
                <a
                  href="app-settings:"
                  className="flex items-center gap-1 text-xs text-accent-green-dark font-medium shrink-0"
                  aria-label="Open settings"
                >
                  Settings
                  <ExternalLink className="size-3" />
                </a>
              </div>
            ) : (
              <ToggleRow
                icon={<Bell className="size-4" />}
                label="Push notifications"
                description={isSubscribed ? "This device is subscribed" : "Off on this device"}
                checked={isSubscribed}
                onChange={handleMasterToggle}
              />
            )}
          </Section>

          {/* Loading indicator for master toggle */}
          {isLoading && (
            <div className="flex items-center gap-2 px-1">
              <Loader2 className="size-4 animate-spin text-accent-green-dark" />
              <p className="text-xs text-text-secondary">
                {isSubscribed ? "Disabling…" : "Enabling…"}
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <p className="text-xs text-warm-orange-brown px-1">{error}</p>
          )}

          {/* Chat preferences */}
          <Section title="Chat">
            <ToggleRow
              icon={<Users className="size-4" />}
              label="All Team messages"
              description="Farm-wide group chat"
              checked={preferences?.chat_all_team ?? true}
              disabled={categoryDisabled}
              onChange={(v) => handlePrefToggle("chat_all_team", v)}
            />
            <ToggleRow
              icon={<Shield className="size-4" />}
              label="Admin messages"
              description="Admin-only channel"
              checked={preferences?.chat_admin ?? true}
              disabled={categoryDisabled}
              onChange={(v) => handlePrefToggle("chat_admin", v)}
            />
            <ToggleRow
              icon={<MessageSquare className="size-4" />}
              label="Direct messages"
              description="Personal bot DM channel"
              checked={preferences?.chat_dm ?? true}
              disabled={categoryDisabled}
              onChange={(v) => handlePrefToggle("chat_dm", v)}
            />
          </Section>

          {/* Show event preferences */}
          <Section title="Show Events">
            <ToggleRow
              icon={<Bell className="size-4" />}
              label="Class status changes"
              description="Class started or completed"
              checked={preferences?.class_status ?? true}
              disabled={categoryDisabled}
              onChange={(v) => handlePrefToggle("class_status", v)}
            />
            <ToggleRow
              icon={<Clock className="size-4" />}
              label="Time changes"
              description="Estimated start time updated"
              checked={preferences?.time_changes ?? true}
              disabled={categoryDisabled}
              onChange={(v) => handlePrefToggle("time_changes", v)}
            />
            <ToggleRow
              icon={<Trophy className="size-4" />}
              label="Results"
              description="Placing posted for your horse"
              checked={preferences?.results ?? true}
              disabled={categoryDisabled}
              onChange={(v) => handlePrefToggle("results", v)}
            />
            <ToggleRow
              icon={<CheckCircle className="size-4" />}
              label="Horse completed"
              description="Horse finished a trip"
              checked={preferences?.horse_completed ?? true}
              disabled={categoryDisabled}
              onChange={(v) => handlePrefToggle("horse_completed", v)}
            />
            <ToggleRow
              icon={<AlertTriangle className="size-4" />}
              label="Scratched"
              description="Horse scratched from a class"
              checked={preferences?.scratched ?? true}
              disabled={categoryDisabled}
              onChange={(v) => handlePrefToggle("scratched", v)}
            />
            <ToggleRow
              icon={<BarChart2 className="size-4" />}
              label="Progress updates"
              description="Trip count updates during class"
              checked={preferences?.progress_updates ?? false}
              disabled={categoryDisabled}
              onChange={(v) => handlePrefToggle("progress_updates", v)}
            />
            <ToggleRow
              icon={<Sun className="size-4" />}
              label="Morning summary"
              description="Daily schedule overview at 7 AM"
              checked={preferences?.morning_summary ?? true}
              disabled={categoryDisabled}
              onChange={(v) => handlePrefToggle("morning_summary", v)}
            />
          </Section>

          {/* Disable all link */}
          {isSubscribed && permissionState !== "denied" && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => void unsubscribe()}
                disabled={isLoading}
                className="text-xs text-warm-orange-brown underline underline-offset-2 disabled:opacity-50"
              >
                Disable all notifications on this device
              </button>
            </div>
          )}

          {/* Info note about preferences scope */}
          {preferences && (
            <p className="text-xs text-text-secondary text-center px-2 pb-2">
              Category preferences apply to all your devices.
              The master toggle above applies to this device only.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Header ─────────────────────────────────────────────────────────────────────

const Header: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="flex items-center px-4 py-3 border-b border-border-card bg-surface-card shrink-0">
    <button
      type="button"
      onClick={onClose}
      className="text-sm text-accent-green-dark font-medium mr-3"
    >
      ← Back
    </button>
    <h1 className="text-base font-semibold text-text-primary flex-1">
      Notifications
    </h1>
  </div>
);
