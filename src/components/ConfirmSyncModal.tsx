import React from "react";
import { Activity, X } from "lucide-react";

interface ConfirmSyncModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmSyncModal: React.FC<ConfirmSyncModalProps> = ({
  open,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70] bg-black/40 animate-[fadeIn_0.15s_ease-out]"
        onClick={onCancel}
        aria-hidden
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
        <div
          className="w-full max-w-sm bg-surface-card rounded-2xl sm:rounded-xl shadow-lg border border-border-card overflow-hidden animate-[scaleIn_0.2s_ease-out]"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="sync-modal-title"
          aria-describedby="sync-modal-desc"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-0">
            <div className="w-10 h-10 rounded-full bg-accent-green/10 flex items-center justify-center shrink-0">
              <Activity className="size-5 text-accent-green-dark" />
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:bg-background-primary active:bg-background-primary transition-colors touch-manipulation"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 pt-3 pb-5">
            <h2
              id="sync-modal-title"
              className="font-heading text-base font-semibold text-text-primary mb-2"
            >
              Fetch Latest Data?
            </h2>
            <p
              id="sync-modal-desc"
              className="font-body text-sm text-text-secondary leading-relaxed"
            >
              This will get the latest information. It may take
              <span className="font-medium text-text-primary"> 30 sec – 1 min</span>.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-5 pb-5">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-11 sm:h-10 rounded-xl sm:rounded-lg border border-border-card font-body text-sm font-medium text-text-secondary hover:bg-background-primary active:bg-background-primary transition-colors touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 h-11 sm:h-10 rounded-xl sm:rounded-lg font-body text-sm font-medium text-text-on-dark bg-accent-green hover:bg-accent-green-dark active:bg-accent-green-dark transition-colors touch-manipulation"
            >
              Yes, Fetch Data
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
