/**
 * TaskCard — Todoist-style task row with a circle checkbox, description,
 * due date indicator, and recurring icon.
 *
 * Tapping the circle checkbox calls the provided callbacks:
 *  - onComplete(assigneeId)  — when marking pending → completed
 *  - onUncomplete(assigneeId) — when marking completed → pending (direct, no undo needed)
 *
 * The parent (TasksPanel) is responsible for the undo window when completing.
 */

import React, { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { AssignedTask } from "../../contexts/TaskContext";
import { useTasks } from "../../contexts/TaskContext";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a due date ISO string into a human-readable label.
 * Shows time only when it is not midnight (00:00).
 *
 * @param iso - ISO 8601 timestamp string
 * @returns e.g. "Today", "Tomorrow", "Mar 25", "Mar 25 3:00 PM"
 */
function formatDueDate(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();

    // All date comparisons use UTC to avoid timezone-shift issues.
    // A date stored as 2026-03-25 00:00:00+00 must read as March 25 everywhere.
    const dueDateUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const tomorrowUTC = todayUTC + 86_400_000;

    // A task is "date-only" when UTC time is exactly midnight (00:00:00Z).
    // Do not append a time string in that case — the stored time is meaningless.
    const hasTime = date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0;
    const timeStr = hasTime
      ? " " +
        date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : "";

    if (dueDateUTC === todayUTC) return `Today${timeStr}`;
    if (dueDateUTC === tomorrowUTC) return `Tomorrow${timeStr}`;

    const sameYear = date.getUTCFullYear() === now.getUTCFullYear();
    // Use UTC date parts for display so the label matches the stored date
    const displayDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dateLabel = displayDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
      ...(sameYear ? {} : { year: "numeric" }),
    });
    return `${dateLabel}${timeStr}`;
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface TaskCardProps {
  task: AssignedTask;
  /**
   * Called when the user taps the checkbox to mark a pending task complete.
   * The parent handles the undo window before persisting.
   */
  onComplete: (assigneeId: string) => void;
  /**
   * Called when the user taps the task row (not the checkbox) to open the
   * edit modal. The parent is responsible for rendering the modal.
   */
  onEdit: (task: AssignedTask) => void;
}

/**
 * Renders a single assigned task as a Todoist-style row.
 *
 * - Tapping the circle checkbox toggles completion status.
 * - Tapping the description/content area opens the edit modal via `onEdit`.
 */
export const TaskCard: React.FC<TaskCardProps> = ({ task, onComplete, onEdit }) => {
  const { updateAssigneeStatus } = useTasks();
  const [uncompleting, setUncompleting] = useState<boolean>(false);

  const isCompleted = task.assignee_status === "completed";
  const dueDateLabel = task.task.due_date ? formatDueDate(task.task.due_date) : null;

  /**
   * Directly un-complete a task (no undo window — user is restoring a task,
   * which is always safe to do immediately).
   */
  const handleUncomplete = async (): Promise<void> => {
    if (uncompleting) return;
    setUncompleting(true);
    try {
      await updateAssigneeStatus(task.id, "pending");
    } finally {
      setUncompleting(false);
    }
  };

  const handleCheckboxClick = (): void => {
    if (isCompleted) {
      void handleUncomplete();
    } else {
      onComplete(task.id);
    }
  };

  return (
    <div
      className={`flex items-start gap-3 px-1 py-2.5 border-b border-border-card/50 last:border-b-0 ${
        isCompleted ? "opacity-50" : ""
      }`}
    >
      {/* Circle checkbox — only toggles completion, does NOT open edit */}
      <button
        type="button"
        onClick={handleCheckboxClick}
        disabled={uncompleting}
        className="shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors touch-manipulation disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-2"
        style={{
          borderColor: isCompleted
            ? "var(--color-accent-green, #4caf50)"
            : "var(--color-text-secondary, #888)",
          backgroundColor: isCompleted
            ? "var(--color-accent-green, #4caf50)"
            : "transparent",
        }}
        aria-label={isCompleted ? "Mark task as pending" : "Mark task as complete"}
        aria-pressed={isCompleted}
      >
        {uncompleting ? (
          <Loader2 className="size-2.5 animate-spin text-white" aria-hidden />
        ) : isCompleted ? (
          <svg
            viewBox="0 0 10 8"
            className="size-2.5 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="1 4 4 7 9 1" />
          </svg>
        ) : null}
      </button>

      {/* Content — tapping opens the edit modal */}
      <button
        type="button"
        onClick={() => onEdit(task)}
        className="flex-1 min-w-0 text-left touch-manipulation focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-green rounded"
        aria-label={`Edit task: ${task.task.description}`}
      >
        {/* Description */}
        <p
          className={`font-body text-sm leading-snug ${
            isCompleted ? "line-through text-text-secondary" : "text-text-primary"
          }`}
        >
          {task.task.description}
        </p>

        {/* Due date + recurring icon */}
        {dueDateLabel && (
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className={`font-body text-xs ${
                task.isOverdue && !isCompleted ? "text-red-500" : "text-text-secondary"
              }`}
            >
              {dueDateLabel}
            </span>
            {task.task.is_recurring && (
              <RefreshCw
                className={`size-3 shrink-0 ${
                  task.isOverdue && !isCompleted ? "text-red-500" : "text-text-secondary"
                }`}
                aria-label="Recurring task"
              />
            )}
          </div>
        )}

        {/* No due date but recurring */}
        {!dueDateLabel && task.task.is_recurring && (
          <div className="flex items-center gap-1 mt-0.5">
            <RefreshCw
              className="size-3 shrink-0 text-text-secondary"
              aria-label="Recurring task"
            />
            <span className="font-body text-xs text-text-secondary">Recurring</span>
          </div>
        )}
      </button>
    </div>
  );
};
