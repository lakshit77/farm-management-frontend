import React, { useRef, useMemo } from "react";
import {
  Calendar,
  SlidersHorizontal,
  Activity,
  Loader2,
} from "lucide-react";

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
  onDateChange: (date: string) => void;
  onFilterOpen: () => void;
  onSync: () => void;
  syncing: boolean;
  hasActiveFilters: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  showName,
  date,
  onDateChange,
  onFilterOpen,
  onSync,
  syncing,
  hasActiveFilters,
}) => {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const dateLabel = useMemo(() => formatDateForDisplay(date), [date]);

  return (
    <header className="sticky top-0 z-40 h-12 min-h-12 flex items-center gap-1.5 px-3 bg-surface-card border-b border-border-card shadow-card safe-area-top">
      <img
        src="/favicon.svg"
        alt=""
        className="w-5 h-5 rounded shrink-0"
        width={20}
        height={20}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="font-heading text-sm font-bold text-accent-green-dark truncate leading-tight">
          {showName || "ShowGroundsLive"}
        </p>
        <p className="font-body text-[10px] text-text-secondary leading-tight truncate">
          {dateLabel}
        </p>
      </div>

      {/* Date picker — hidden input triggered by icon button */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => dateInputRef.current?.showPicker?.()}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-text-secondary active:bg-background-primary transition-colors touch-manipulation"
          aria-label={`Date: ${date}`}
        >
          <Calendar className="size-4.5" />
        </button>
        <input
          ref={dateInputRef}
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          aria-label="Select date"
          tabIndex={-1}
        />
      </div>

      {/* Filter button */}
      <button
        type="button"
        onClick={onFilterOpen}
        className="relative w-10 h-10 flex items-center justify-center rounded-lg text-text-secondary active:bg-background-primary transition-colors touch-manipulation"
        aria-label="Open filters"
      >
        <SlidersHorizontal className="size-4.5" />
        {hasActiveFilters && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-warm-orange-brown rounded-full" />
        )}
      </button>

      {/* Sync button */}
      <button
        type="button"
        onClick={onSync}
        disabled={syncing}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-accent-green-dark active:bg-accent-green/10 disabled:opacity-50 transition-colors touch-manipulation"
        aria-label="Sync data"
      >
        {syncing ? (
          <Loader2 className="size-4.5 animate-spin" />
        ) : (
          <Activity className="size-4.5" />
        )}
      </button>
    </header>
  );
};
