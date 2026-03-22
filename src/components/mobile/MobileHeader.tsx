import React, { useMemo } from "react";
import { SlidersHorizontal, Menu } from "lucide-react";

function formatDateForDisplay(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

interface MobileHeaderProps {
  showName: string | null;
  date: string;
  onFilterOpen: () => void;
  hasActiveFilters: boolean;
  onDrawerOpen: () => void;
}

/**
 * Slim mobile top bar with branding, current date, filter shortcut, and
 * a hamburger button that opens the MobileDrawer for secondary actions
 * (date picker, sync, notification settings, sign out).
 */
export const MobileHeader: React.FC<MobileHeaderProps> = ({
  showName,
  date,
  onFilterOpen,
  hasActiveFilters,
  onDrawerOpen,
}) => {
  const dateLabel = useMemo(() => formatDateForDisplay(date), [date]);

  return (
    <header className="sticky top-0 z-40 min-h-12 flex items-center gap-1.5 px-3 bg-surface-card border-b border-border-card shadow-card safe-area-top">
      <img
        src="/favicon.svg"
        alt=""
        className="w-5 h-5 rounded shrink-0"
        width={20}
        height={20}
        aria-hidden
      />

      {/* Branding + date */}
      <div className="min-w-0 flex-1 py-1.5">
        <p className="font-heading text-sm font-bold text-accent-green-dark truncate leading-tight">
          {showName || "ShowGroundsLive"}
        </p>
        <p className="font-body text-[10px] text-text-secondary leading-tight truncate">
          {dateLabel}
        </p>
      </div>

      {/* Filter button — high-frequency action stays in header */}
      <button
        type="button"
        onClick={onFilterOpen}
        className="relative w-10 h-10 flex items-center justify-center rounded-lg text-text-secondary active:bg-background-primary transition-colors touch-manipulation"
        aria-label="Open filters"
      >
        <SlidersHorizontal className="size-4.5" aria-hidden />
        {hasActiveFilters && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-warm-orange-brown rounded-full" aria-hidden />
        )}
      </button>

      {/* Hamburger — opens drawer for all secondary actions */}
      <button
        type="button"
        onClick={onDrawerOpen}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-text-secondary active:bg-background-primary transition-colors touch-manipulation"
        aria-label="Open menu"
        aria-haspopup="dialog"
      >
        <Menu className="size-4.5" aria-hidden />
      </button>
    </header>
  );
};
