/**
 * SoftPermissionPrompt — in-app card shown before triggering the browser
 * permission dialog. This is the industry-standard two-step approach:
 *   1. Show this card (our own UI, no browser involvement)
 *   2. Only if user taps "Enable" → trigger the real browser dialog
 *
 * Shown when:
 *   - promptState === "never_asked" (first time)
 *   - promptState === "dismissed_ready" (3+ days since last dismissal)
 *
 * Hidden when:
 *   - User tapped "Not Now" (promptState becomes "dismissed_recently")
 *   - User already granted or blocked permission
 *   - iOS and not in standalone mode (show IosBanner instead)
 *   - 5-second delay after mount has not elapsed yet
 */

import React, { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, X } from "lucide-react";
import type { PromptState } from "../../hooks/usePushNotifications";

interface SoftPermissionPromptProps {
  promptState: PromptState;
  isLoading: boolean;
  error: string | null;
  onEnable: () => void;
  onDismiss: () => void;
}

export const SoftPermissionPrompt: React.FC<SoftPermissionPromptProps> = ({
  promptState,
  isLoading,
  error,
  onEnable,
  onDismiss,
}) => {
  // 5-second delay so the card doesn't pop up instantly on mount
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (promptState !== "never_asked" && promptState !== "dismissed_ready") return;
    const timer = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(timer);
  }, [promptState]);

  if (!visible) return null;
  if (promptState !== "never_asked" && promptState !== "dismissed_ready") return null;

  return (
    <div
      className="fixed bottom-20 left-3 right-3 z-[80] max-w-sm mx-auto"
      role="dialog"
      aria-modal="false"
      aria-label="Enable push notifications"
    >
      <div className="bg-surface-card border border-border-card rounded-2xl shadow-lg p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="size-8 rounded-full bg-accent-green-dark/10 flex items-center justify-center shrink-0">
              <Bell className="size-4 text-accent-green-dark" />
            </span>
            <p className="text-sm font-semibold text-text-primary leading-tight">
              Stay in the loop
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="p-1 rounded-full text-text-secondary hover:text-text-primary transition-colors shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <p className="text-xs text-text-secondary mb-3 leading-relaxed pl-10">
          Get alerts for results, scratches, time changes, and chat messages —
          even when the app is closed.
        </p>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-1.5 mb-2 pl-10">
            <BellOff className="size-3.5 text-warm-orange-brown shrink-0" />
            <p className="text-xs text-warm-orange-brown">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pl-10">
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 text-xs font-medium text-text-secondary border border-border-card rounded-lg py-2 px-3 hover:bg-surface-hover transition-colors"
          >
            Not Now
          </button>
          <button
            type="button"
            onClick={onEnable}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-accent-green-dark text-white rounded-lg py-2 px-3 hover:bg-accent-green-dark/90 transition-colors disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Enabling…
              </>
            ) : (
              "Enable Alerts"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
