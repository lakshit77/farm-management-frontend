/**
 * EditTaskModal — bottom-sheet modal for editing an existing task or deleting it.
 *
 * Pre-populates all fields from the given AssignedTask and calls
 * TaskContext.updateTask() on save or TaskContext.deleteTask() on delete.
 *
 * The form is identical in structure to CreateTaskModal:
 *  - Description (required)
 *  - Due date (optional) + Due time (optional, shown when date is set)
 *  - Recurring toggle with Daily / Weekly (day chips) / Monthly (day-of-month grid)
 *
 * A red "Delete task" button at the bottom triggers a confirmation step
 * before permanently removing the task.
 */

import React, { useState, useMemo } from "react";
import { X, Calendar, RefreshCw, Loader2, Trash2 } from "lucide-react";
import { useTasks, type AssignedTask, type UpdateTaskInput } from "../../contexts/TaskContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RepeatType = "daily" | "weekly" | "monthly";

// ---------------------------------------------------------------------------
// Helpers — identical to CreateTaskModal
// ---------------------------------------------------------------------------

/**
 * Build a 5-field cron expression from the recurrence settings.
 * Stores minute/hour in LOCAL time (no UTC conversion) so cron-parser
 * (which runs in local timezone) interprets them correctly.
 *
 * @param type      - daily | weekly | monthly
 * @param weekDays  - set of 0-6 (Sun=0) for weekly recurrence
 * @param monthDays - set of 1-31 for monthly recurrence
 * @param timeStr   - "HH:MM" in the user's LOCAL time, or "" for midnight
 */
function buildCron(
  type: RepeatType,
  weekDays: Set<number>,
  monthDays: Set<number>,
  timeStr: string
): string {
  let hour = 0;
  let minute = 0;
  if (timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    hour = h;
    minute = m;
  }

  const minutePart = String(minute);
  const hourPart = String(hour);

  if (type === "daily") return `${minutePart} ${hourPart} * * *`;

  if (type === "weekly") {
    const days =
      weekDays.size > 0
        ? [...weekDays].sort((a, b) => a - b).join(",")
        : "*";
    return `${minutePart} ${hourPart} * * ${days}`;
  }

  // monthly
  const days =
    monthDays.size > 0
      ? [...monthDays].sort((a, b) => a - b).join(",")
      : "1";
  return `${minutePart} ${hourPart} ${days} * *`;
}

/**
 * Build an ISO UTC timestamp string from a date string ("YYYY-MM-DD") and an
 * optional time string ("HH:MM" local). When no time is provided the time
 * component is set to 00:00:00 UTC.
 */
function buildDueDateISO(dateStr: string, timeStr: string): string {
  if (!timeStr) return `${dateStr}T00:00:00.000Z`;
  const local = new Date(`${dateStr}T${timeStr}:00`);
  return local.toISOString();
}

/**
 * Parse a stored ISO due_date string into separate date ("YYYY-MM-DD") and
 * time ("HH:MM") strings for pre-populating the form inputs.
 * Returns empty strings if the value is null.
 */
function parseDueDate(iso: string | null): { dateStr: string; timeStr: string } {
  if (!iso) return { dateStr: "", timeStr: "" };
  const d = new Date(iso);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;
  const hasTime = d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0;
  if (!hasTime) return { dateStr, timeStr: "" };
  // Convert from UTC back to local for display in the time input
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return { dateStr, timeStr: `${hours}:${minutes}` };
}

/**
 * Parse a stored 5-field cron string into RepeatType + selected day sets.
 * Returns sensible defaults if the cron cannot be parsed.
 *
 * @param cron - e.g. "0 19 * * *", "0 9 * * 1,3,5", "30 8 1,15 * *"
 */
function parseCron(cron: string | null): {
  repeatType: RepeatType;
  weekDays: Set<number>;
  monthDays: Set<number>;
  timeStr: string;
} {
  if (!cron) return { repeatType: "daily", weekDays: new Set(), monthDays: new Set(), timeStr: "" };

  try {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) throw new Error("invalid");

    const [minutePart, hourPart, domPart, , dowPart] = parts;
    const hour = parseInt(hourPart, 10);
    const minute = parseInt(minutePart, 10);
    const timeStr =
      isNaN(hour) || isNaN(minute)
        ? ""
        : `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    // Determine type from day-of-month and day-of-week fields
    if (domPart !== "*") {
      // Monthly
      const monthDays = new Set(
        domPart.split(",").map(Number).filter((n) => n >= 1 && n <= 31)
      );
      return { repeatType: "monthly", weekDays: new Set(), monthDays, timeStr };
    }

    if (dowPart !== "*") {
      // Weekly
      const weekDays = new Set(
        dowPart.split(",").map(Number).filter((n) => n >= 0 && n <= 6)
      );
      return { repeatType: "weekly", weekDays, monthDays: new Set(), timeStr };
    }

    // Daily
    return { repeatType: "daily", weekDays: new Set(), monthDays: new Set(), timeStr };
  } catch {
    return { repeatType: "daily", weekDays: new Set(), monthDays: new Set(), timeStr: "" };
  }
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const WEEK_DAYS: { label: string; value: number }[] = [
  { label: "M", value: 1 },
  { label: "T", value: 2 },
  { label: "W", value: 3 },
  { label: "T", value: 4 },
  { label: "F", value: 5 },
  { label: "S", value: 6 },
  { label: "S", value: 0 },
];

const WEEK_DAY_FULL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  ariaLabel?: string;
}

/** Small selectable chip. */
const Chip: React.FC<ChipProps> = ({ label, selected, onClick, ariaLabel }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    aria-label={ariaLabel ?? label}
    className={`inline-flex items-center justify-center rounded-lg font-body text-xs font-semibold transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green ${
      selected
        ? "bg-accent-green text-white"
        : "bg-surface-card border border-border-card text-text-secondary hover:border-accent-green/40"
    }`}
  >
    {label}
  </button>
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EditTaskModalProps {
  /** The task to edit (provides initial form values). */
  task: AssignedTask;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Slide-up bottom sheet that lets the current user edit or delete a task.
 */
export const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, onClose }) => {
  const { updateTask, deleteTask } = useTasks();

  // Parse stored values into form state
  const { dateStr: initDateStr, timeStr: initTimeStr } = parseDueDate(task.task.due_date);
  const { repeatType: initRepeatType, weekDays: initWeekDays, monthDays: initMonthDays } =
    parseCron(task.task.recurrence_cron);

  const [description, setDescription] = useState<string>(task.task.description);
  const [dateStr, setDateStr] = useState<string>(initDateStr);
  const [timeStr, setTimeStr] = useState<string>(initTimeStr);
  const [isRecurring, setIsRecurring] = useState<boolean>(task.task.is_recurring);

  const [repeatType, setRepeatType] = useState<RepeatType>(initRepeatType);
  const [selectedWeekDays, setSelectedWeekDays] = useState<Set<number>>(initWeekDays);
  const [selectedMonthDays, setSelectedMonthDays] = useState<Set<number>>(initMonthDays);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  /** Toggle a value in/out of a Set, returning a new Set. */
  const toggleInSet = (set: Set<number>, value: number): Set<number> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  /** Human-readable summary of the current recurrence setting. */
  const recurrenceSummary = useMemo((): string => {
    if (!isRecurring) return "";
    if (repeatType === "daily") return "Repeats every day";
    if (repeatType === "weekly") {
      if (selectedWeekDays.size === 0) return "Pick at least one day";
      const dayNames = [...selectedWeekDays]
        .sort((a, b) => {
          const order = [1, 2, 3, 4, 5, 6, 0];
          return order.indexOf(a) - order.indexOf(b);
        })
        .map((v) => {
          const idx = [1, 2, 3, 4, 5, 6, 0].indexOf(v);
          return WEEK_DAY_FULL[idx];
        });
      return `Repeats every ${dayNames.join(", ")}`;
    }
    if (repeatType === "monthly") {
      if (selectedMonthDays.size === 0) return "Pick at least one date";
      const days = [...selectedMonthDays].sort((a, b) => a - b).join(", ");
      return `Repeats on the ${days}${selectedMonthDays.size === 1 ? ordinal([...selectedMonthDays][0]) : ""} of each month`;
    }
    return "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecurring, repeatType, selectedWeekDays, selectedMonthDays]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setValidationError(null);

    if (!description.trim()) {
      setValidationError("Please enter a task description.");
      return;
    }

    if (isRecurring) {
      if (repeatType === "weekly" && selectedWeekDays.size === 0) {
        setValidationError("Please select at least one day for the weekly recurrence.");
        return;
      }
      if (repeatType === "monthly" && selectedMonthDays.size === 0) {
        setValidationError("Please select at least one date for the monthly recurrence.");
        return;
      }
    }

    const cron = isRecurring
      ? buildCron(repeatType, selectedWeekDays, selectedMonthDays, timeStr)
      : null;

    const input: UpdateTaskInput = {
      taskId: task.task.id,
      description: description.trim(),
      due_date: dateStr ? buildDueDateISO(dateStr, timeStr) : null,
      is_recurring: isRecurring,
      recurrence_cron: cron,
    };

    setSubmitting(true);
    try {
      await updateTask(input);
      onClose();
    } catch {
      setValidationError("Failed to update task. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    setDeleting(true);
    try {
      await deleteTask(task.task.id);
      onClose();
    } catch {
      setValidationError("Failed to delete task. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[95] bg-background-primary rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 1rem)" }}
        role="dialog"
        aria-modal
        aria-label="Edit task"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border-card" aria-hidden />
        </div>

        {/* Header */}
        <div className="flex items-center px-4 py-2 border-b border-border-card">
          <h2 className="font-heading text-base font-semibold text-text-primary flex-1">
            Edit Task
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-background-primary transition-colors touch-manipulation"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="px-4 pt-4 pb-2">

          {/* Description */}
          <div className="mb-4">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to be done?"
              rows={2}
              autoFocus
              className="w-full bg-surface-card border border-border-card rounded-xl px-3 py-2.5 font-body text-sm text-text-primary placeholder:text-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-transparent"
              aria-label="Task description"
            />
          </div>

          {/* Due date + time */}
          <div className="mb-4">
            <label className="flex items-center gap-1.5 mb-1.5">
              <Calendar className="size-3.5 text-text-secondary shrink-0" aria-hidden />
              <span className="font-body text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Due date (optional)
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateStr}
                onChange={(e) => {
                  setDateStr(e.target.value);
                  if (!e.target.value) setTimeStr("");
                }}
                className="flex-1 bg-surface-card border border-border-card rounded-xl px-3 py-2 font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-transparent"
                aria-label="Due date"
              />
              {dateStr && (
                <input
                  type="time"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  className="w-32 bg-surface-card border border-border-card rounded-xl px-3 py-2 font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-transparent"
                  aria-label="Due time"
                />
              )}
            </div>
          </div>

          {/* Recurring toggle */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setIsRecurring((v) => !v)}
              className="flex items-center gap-2 w-full py-2 touch-manipulation"
              aria-pressed={isRecurring}
            >
              <RefreshCw
                className={`size-3.5 shrink-0 ${isRecurring ? "text-accent-green-dark" : "text-text-secondary"}`}
                aria-hidden
              />
              <span
                className={`font-body text-xs font-semibold uppercase tracking-wide flex-1 text-left ${
                  isRecurring ? "text-accent-green-dark" : "text-text-secondary"
                }`}
              >
                Recurring
              </span>
              <div
                className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
                  isRecurring ? "bg-accent-green" : "bg-border-card"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    isRecurring ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </div>
            </button>

            {isRecurring && (
              <div className="mt-2 space-y-3">
                {/* Repeat type chips */}
                <div className="flex gap-2">
                  {(["daily", "weekly", "monthly"] as RepeatType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRepeatType(t)}
                      aria-pressed={repeatType === t}
                      className={`flex-1 h-9 rounded-xl font-body text-xs font-semibold transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green capitalize ${
                        repeatType === t
                          ? "bg-accent-green text-white"
                          : "bg-surface-card border border-border-card text-text-secondary hover:border-accent-green/40"
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Weekly: day-of-week chips */}
                {repeatType === "weekly" && (
                  <div>
                    <p className="font-body text-[11px] text-text-secondary mb-1.5">
                      Repeat on
                    </p>
                    <div className="grid grid-cols-7 gap-1">
                      {WEEK_DAYS.map((d, idx) => (
                        <Chip
                          key={d.value}
                          label={d.label}
                          selected={selectedWeekDays.has(d.value)}
                          onClick={() =>
                            setSelectedWeekDays((prev) => toggleInSet(prev, d.value))
                          }
                          ariaLabel={WEEK_DAY_FULL[idx]}
                        />
                      ))}
                    </div>
                    <style>{`.grid-cols-7 > button { aspect-ratio: 1; }`}</style>
                  </div>
                )}

                {/* Monthly: day-of-month grid */}
                {repeatType === "monthly" && (
                  <div>
                    <p className="font-body text-[11px] text-text-secondary mb-1.5">
                      Repeat on day
                    </p>
                    <div className="grid grid-cols-7 gap-1">
                      {MONTH_DAYS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() =>
                            setSelectedMonthDays((prev) => toggleInSet(prev, day))
                          }
                          aria-pressed={selectedMonthDays.has(day)}
                          aria-label={`Day ${day}`}
                          className={`aspect-square flex items-center justify-center rounded-lg font-body text-xs font-semibold transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green ${
                            selectedMonthDays.has(day)
                              ? "bg-accent-green text-white"
                              : "bg-surface-card border border-border-card text-text-secondary hover:border-accent-green/40"
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recurrence summary */}
                {recurrenceSummary && (
                  <p className="font-body text-xs text-accent-green-dark bg-accent-green/5 border border-accent-green/20 rounded-lg px-3 py-2">
                    {recurrenceSummary}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Validation error */}
          {validationError && (
            <p className="font-body text-xs text-red-500 mb-3">{validationError}</p>
          )}

          {/* Save */}
          <button
            type="submit"
            disabled={submitting || deleting || !description.trim()}
            className="w-full h-11 rounded-xl font-body text-sm font-semibold text-text-on-dark bg-accent-green hover:bg-accent-green-dark disabled:opacity-50 transition-colors touch-manipulation flex items-center justify-center gap-2 mb-3"
          >
            {submitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {submitting ? "Saving…" : "Save Changes"}
          </button>

          {/* Delete — shows confirm step on first tap */}
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={submitting || deleting}
              className="w-full h-11 rounded-xl font-body text-sm font-semibold text-red-500 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors touch-manipulation flex items-center justify-center gap-2 mb-2"
            >
              <Trash2 className="size-4" aria-hidden />
              Delete Task
            </button>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 mb-2">
              <p className="font-body text-sm text-red-700 font-semibold mb-2 text-center">
                Delete this task permanently?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="flex-1 h-9 rounded-lg font-body text-sm font-medium text-text-secondary border border-border-card bg-white hover:bg-background-primary disabled:opacity-50 transition-colors touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className="flex-1 h-9 rounded-lg font-body text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors touch-manipulation flex items-center justify-center gap-1.5"
                >
                  {deleting && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
                  {deleting ? "Deleting…" : "Yes, Delete"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Util
// ---------------------------------------------------------------------------

/** Return the ordinal suffix for a number (1→"st", 2→"nd", etc.) */
function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}
