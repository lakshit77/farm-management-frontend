/**
 * IosBanner — shown when the user opens the app in Safari on iOS
 * instead of from the home screen (standalone mode).
 *
 * iOS requires the PWA to be installed to the home screen before
 * push notifications can be enabled. This banner explains how.
 * It can be dismissed permanently via localStorage.
 */

import React, { useState } from "react";
import { Share, X } from "lucide-react";

const LS_IOS_BANNER_DISMISSED = "ios_banner_dismissed";

interface IosBannerProps {
  /** Whether to render the banner at all (caller handles iOS detection). */
  visible: boolean;
}

export const IosBanner: React.FC<IosBannerProps> = ({ visible }) => {
  const [dismissed, setDismissed] = useState<boolean>(
    () => localStorage.getItem(LS_IOS_BANNER_DISMISSED) === "true"
  );

  if (!visible || dismissed) return null;

  function handleDismiss() {
    localStorage.setItem(LS_IOS_BANNER_DISMISSED, "true");
    setDismissed(true);
  }

  return (
    <div
      className="w-full bg-accent-green-dark text-white px-4 py-2.5 flex items-center gap-3 z-50"
      role="status"
      aria-live="polite"
    >
      {/* Share icon represents the iOS share sheet */}
      <Share className="size-4 shrink-0 opacity-90" />

      <p className="flex-1 text-xs font-medium leading-snug">
        Add to Home Screen to enable push notifications.{" "}
        <span className="opacity-80">
          Tap <Share className="inline size-3 mx-0.5 -mt-0.5" /> then &ldquo;Add to Home
          Screen&rdquo;.
        </span>
      </p>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
      >
        <X className="size-4" />
      </button>
    </div>
  );
};
