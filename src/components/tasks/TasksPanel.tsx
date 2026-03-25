/**
 * TasksPanel — full-screen overlay with a Todoist-inspired layout.
 *
 * Layout:
 *  1. Header — back button, title, refresh
 *  2. Week date strip — Mon-Sun for the selected week, today highlighted.
 *     Tapping a date filters the task list to tasks due that day.
 *     Left/right arrows navigate between weeks.
 *  3. Overdue section — always visible (when overdue tasks exist), regardless
 *     of the selected date. Collapsible.
 *  4. Date task list — tasks due on the selected date, split into
 *     "pending" and "completed" sub-sections.
 *  5. Empty state — shown when no tasks exist at all.
 *  6. Undo toast — appears at the bottom for 3 s after marking a task
 *     complete, letting the user cancel the action before it is persisted.
 *
 * Overdue = due_date < today (or no due_date) AND assignee status is not 'completed'.
 */

import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import {
  useTasks,
  type AssignedTask,
} from "../../contexts/TaskContext";
import { TaskCard } from "./TaskCard";
import { CreateTaskModal } from "./CreateTaskModal";
import { EditTaskModal } from "./EditTaskModal";

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Return the Monday (UTC) of the ISO week that `date` belongs to. */
function getMondayOfWeek(date: Date): Date {
  const day = date.getUTCDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Mon
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + diff));
}

/** Return an array of 7 UTC-midnight Date objects starting from Monday. */
function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + i))
  );
}

/** True if two dates fall on the same UTC calendar day. */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * True if the task's due_date falls on the given calendar day.
 * Comparison uses UTC dates so that a due_date of 2026-03-25 00:00:00+00
 * correctly matches "Wednesday March 25" in any timezone.
 */
function isDueOnDay(task: AssignedTask, day: Date): boolean {
  if (!task.task.due_date) return false;
  return isSameDay(new Date(task.task.due_date), day);
}

/** Format a Date as "March 2026". */
function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
/** How long (ms) the undo window stays open. */
const UNDO_DURATION_MS = 3000;

// ---------------------------------------------------------------------------
// Undo state type
// ---------------------------------------------------------------------------

interface PendingCompletion {
  /** task_assignees.id being completed */
  assigneeId: string;
  /** Human-readable task description for the toast label */
  description: string;
  /** setTimeout handle so we can clear it on undo */
  timerId: ReturnType<typeof setTimeout>;
  /** Progress from 1→0 used to drive the shrinking bar */
  startTime: number;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface CollapsibleSectionProps {
  title: string;
  count: number;
  accentClass?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/**
 * Collapsible section with a header row showing title, count badge, and arrow.
 */
const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  count,
  accentClass = "text-text-secondary",
  defaultOpen = true,
  children,
}) => {
  const [open, setOpen] = useState<boolean>(defaultOpen);

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-1 py-2 text-left touch-manipulation"
        aria-expanded={open}
      >
        <span className={`font-body text-sm font-semibold flex-1 ${accentClass}`}>
          {title}
        </span>
        {count > 0 && (
          <span
            className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full font-body text-[11px] font-semibold ${accentClass} bg-border-card/60`}
          >
            {count}
          </span>
        )}
        {open ? (
          <ChevronDown className="size-3.5 text-text-secondary shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="size-3.5 text-text-secondary shrink-0" aria-hidden />
        )}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Undo toast sub-component
// ---------------------------------------------------------------------------

interface UndoToastProps {
  description: string;
  startTime: number;
  onUndo: () => void;
}

/**
 * Fixed bottom toast showing "Completed" with an Undo button and a shrinking
 * progress bar that counts down the undo window.
 */
const UndoToast: React.FC<UndoToastProps> = ({ description, startTime, onUndo }) => {
  const [progress, setProgress] = useState<number>(1);
  const rafRef = useRef<number | null>(null);

  // Animate the progress bar using requestAnimationFrame
  React.useEffect(() => {
    const tick = (): void => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 1 - elapsed / UNDO_DURATION_MS);
      setProgress(remaining);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [startTime]);

  return (
    <div
      className="fixed bottom-6 left-4 right-4 z-[100] rounded-2xl bg-surface-card border border-border-card shadow-lg overflow-hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      role="status"
      aria-live="polite"
      aria-label={`Task completed. Undo available.`}
    >
      {/* Progress bar — shrinks left-to-right over UNDO_DURATION_MS */}
      <div
        className="h-0.5 bg-accent-green transition-none"
        style={{ width: `${progress * 100}%` }}
        aria-hidden
      />

      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icon */}
        <RotateCcw className="size-4 text-accent-green-dark shrink-0" aria-hidden />

        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="font-body text-sm font-semibold text-text-primary leading-tight">
            Completed
          </p>
          <p className="font-body text-xs text-text-secondary truncate leading-tight mt-0.5">
            {description}
          </p>
        </div>

        {/* Undo button */}
        <button
          type="button"
          onClick={onUndo}
          className="shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-lg font-body text-sm font-semibold text-accent-green-dark border border-accent-green/30 bg-accent-green/5 hover:bg-accent-green/10 transition-colors touch-manipulation"
          aria-label="Undo task completion"
        >
          Undo
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface TasksPanelProps {
  /** Called when the user presses the back / close button. */
  onClose: () => void;
}

/**
 * Full-screen tasks panel with a Todoist-style weekly date strip,
 * persistent Overdue section, date-filtered task list, and an undo toast
 * when a task is marked complete.
 */
export const TasksPanel: React.FC<TasksPanelProps> = ({ onClose }) => {
  const { tasks, loading, error, fetchTasks, updateAssigneeStatus } = useTasks();

  // Use a UTC-midnight date for "today" so all isSameDay comparisons (which
  // use UTC fields) correctly identify the current calendar day regardless of
  // the user's local timezone.
  const today = useMemo(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(today));

  /** Whether the CreateTaskModal is open. */
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  /** The task currently being edited, or null when the edit modal is closed. */
  const [editingTask, setEditingTask] = useState<AssignedTask | null>(null);

  /** The currently pending completion waiting for the undo window to expire. */
  const [pendingCompletion, setPendingCompletion] =
    useState<PendingCompletion | null>(null);

  /**
   * IDs of tasks that are "visually completed" — the user has tapped the
   * checkbox but the undo window has not expired yet. We optimistically render
   * them as completed in the UI without persisting to Supabase yet.
   */
  const [optimisticCompleted, setOptimisticCompleted] = useState<Set<string>>(
    new Set()
  );

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const goToPrevWeek = (): void => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const goToNextWeek = (): void => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  /**
   * Commit a pending completion to Supabase. Called when the undo timer
   * expires without the user pressing Undo.
   */
  const commitCompletion = useCallback(
    async (assigneeId: string): Promise<void> => {
      setPendingCompletion(null);
      setOptimisticCompleted((prev) => {
        const next = new Set(prev);
        next.delete(assigneeId);
        return next;
      });
      await updateAssigneeStatus(assigneeId, "completed");
    },
    [updateAssigneeStatus]
  );

  /**
   * Called by TaskCard when the user taps the checkbox on a pending task.
   * Starts the 3-second undo window — does NOT persist yet.
   */
  const handleComplete = useCallback(
    (assigneeId: string): void => {
      // If there's already a pending completion for a different task, commit it
      // immediately before starting a new undo window.
      if (pendingCompletion && pendingCompletion.assigneeId !== assigneeId) {
        clearTimeout(pendingCompletion.timerId);
        void commitCompletion(pendingCompletion.assigneeId);
      }

      const task = tasks.find((t) => t.id === assigneeId);
      if (!task) return;

      // Mark optimistically completed in UI
      setOptimisticCompleted((prev) => new Set(prev).add(assigneeId));

      // Start the undo countdown timer
      const timerId = setTimeout(() => {
        void commitCompletion(assigneeId);
      }, UNDO_DURATION_MS);

      setPendingCompletion({
        assigneeId,
        description: task.task.description,
        timerId,
        startTime: Date.now(),
      });
    },
    [pendingCompletion, tasks, commitCompletion]
  );

  /**
   * Cancel the pending completion — revert the optimistic UI update and
   * clear the timer. No Supabase call needed since we never wrote to it.
   */
  const handleUndo = useCallback((): void => {
    if (!pendingCompletion) return;
    clearTimeout(pendingCompletion.timerId);
    setOptimisticCompleted((prev) => {
      const next = new Set(prev);
      next.delete(pendingCompletion.assigneeId);
      return next;
    });
    setPendingCompletion(null);
  }, [pendingCompletion]);

  /**
   * Build a view of tasks with optimistic completions applied, so the UI
   * reflects the user's tap immediately without waiting for Supabase.
   */
  const tasksWithOptimistic = useMemo(
    () =>
      tasks.map((t) =>
        optimisticCompleted.has(t.id)
          ? { ...t, assignee_status: "completed" as const, isOverdue: false }
          : t
      ),
    [tasks, optimisticCompleted]
  );

  const overdueTasks = useMemo(
    () => tasksWithOptimistic.filter((t) => t.isOverdue),
    [tasksWithOptimistic]
  );

  const tasksOnSelectedDate = useMemo(
    () =>
      tasksWithOptimistic.filter(
        (t) => isDueOnDay(t, selectedDate) && !t.isOverdue
      ),
    [tasksWithOptimistic, selectedDate]
  );

  const pendingOnDate = useMemo(
    () => tasksOnSelectedDate.filter((t) => t.assignee_status !== "completed"),
    [tasksOnSelectedDate]
  );

  const completedOnDate = useMemo(
    () => tasksOnSelectedDate.filter((t) => t.assignee_status === "completed"),
    [tasksOnSelectedDate]
  );

  const hasAnyTasks = tasks.length > 0;
  const monthLabel = formatMonthYear(weekDays[0]);

  const hasTasks = (day: Date): boolean =>
    tasksWithOptimistic.some((t) => isDueOnDay(t, day));

  return (
    <div className="flex flex-col h-full bg-background-primary safe-area-top">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center px-4 py-3 border-b border-border-card bg-surface-card shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-accent-green-dark font-medium mr-3 touch-manipulation"
          aria-label="Close tasks panel"
        >
          ← Back
        </button>

        <h1 className="text-base font-semibold text-text-primary flex-1 truncate leading-tight">
          My Tasks
        </h1>

        <button
          type="button"
          onClick={() => void fetchTasks()}
          disabled={loading}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:bg-background-primary disabled:opacity-50 transition-colors touch-manipulation"
          aria-label="Refresh tasks"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-4" aria-hidden />
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Weekly date strip                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-surface-card border-b border-border-card shrink-0 px-3 pb-3">
        {/* Month label + week nav */}
        <div className="flex items-center justify-between pt-2 pb-1 px-1">
          <button
            type="button"
            onClick={goToPrevWeek}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:bg-background-primary transition-colors touch-manipulation"
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>

          <span className="font-body text-xs font-semibold text-text-secondary uppercase tracking-wide">
            {monthLabel}
          </span>

          <button
            type="button"
            onClick={goToNextWeek}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:bg-background-primary transition-colors touch-manipulation"
            aria-label="Next week"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>

        {/* Day columns */}
        <div className="grid grid-cols-7 gap-0.5">
          {weekDays.map((day, idx) => {
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDate);
            const hasTasksDot = hasTasks(day);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelectedDate(day)}
                className="flex flex-col items-center gap-0.5 py-1.5 rounded-xl touch-manipulation transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-1"
                style={{
                  backgroundColor: isSelected
                    ? "var(--color-accent-green, #4caf50)"
                    : isToday
                    ? "var(--color-accent-green-light, rgba(76,175,80,0.12))"
                    : "transparent",
                }}
                aria-label={day.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
                aria-pressed={isSelected}
              >
                <span
                  className="font-body text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    color: isSelected
                      ? "#fff"
                      : isToday
                      ? "var(--color-accent-green-dark, #388e3c)"
                      : "var(--color-text-secondary, #888)",
                  }}
                >
                  {DAY_LABELS[idx]}
                </span>
                <span
                  className="font-body text-sm font-bold leading-none"
                  style={{
                    color: isSelected
                      ? "#fff"
                      : isToday
                      ? "var(--color-accent-green-dark, #388e3c)"
                      : "var(--color-text-primary, #111)",
                  }}
                >
                  {day.getDate()}
                </span>
                <span
                  className="w-1 h-1 rounded-full"
                  style={{
                    backgroundColor: hasTasksDot
                      ? isSelected
                        ? "rgba(255,255,255,0.7)"
                        : "var(--color-accent-green, #4caf50)"
                      : "transparent",
                  }}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Scrollable content                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-3"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 5rem)" }}
      >
        {/* Error banner */}
        {error && !loading && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="font-body text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="size-8 animate-spin text-accent-green" aria-hidden />
            <p className="font-body text-sm text-text-secondary">Loading tasks…</p>
          </div>
        )}

        {/* Empty state — no tasks assigned at all */}
        {!loading && !hasAnyTasks && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-border-card flex items-center justify-center">
              <ClipboardList className="size-8 text-text-secondary opacity-60" aria-hidden />
            </div>
            <div>
              <p className="font-heading text-base font-semibold text-text-primary mb-1">
                No tasks assigned
              </p>
              <p className="font-body text-sm text-text-secondary max-w-xs">
                Tasks assigned to you will appear here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void fetchTasks()}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg font-body text-sm font-medium text-accent-green-dark border border-accent-green/30 bg-accent-green/5 hover:bg-accent-green/10 transition-colors touch-manipulation"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              Refresh
            </button>
          </div>
        )}

        {/* Main content */}
        {!loading && hasAnyTasks && (
          <div className="pb-6">
            {/* Overdue section */}
            {overdueTasks.length > 0 && (
              <CollapsibleSection
                title="Overdue"
                count={overdueTasks.length}
                accentClass="text-red-500"
                defaultOpen={true}
              >
                <div className="bg-surface-card rounded-xl border border-red-100 overflow-hidden mb-3">
                  {overdueTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={handleComplete}
                      onEdit={setEditingTask}
                    />
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Selected date header */}
            <div className="flex items-center gap-2 px-1 mt-1 mb-2">
              <span className="font-body text-sm font-semibold text-text-primary">
                {isSameDay(selectedDate, today)
                  ? "Today"
                  : selectedDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
              </span>
              {tasksOnSelectedDate.length > 0 && (
                <span className="font-body text-xs text-text-secondary">
                  ({tasksOnSelectedDate.length} task
                  {tasksOnSelectedDate.length !== 1 ? "s" : ""})
                </span>
              )}
            </div>

            {/* Pending tasks for selected date */}
            {pendingOnDate.length > 0 && (
              <div className="bg-surface-card rounded-xl border border-border-card overflow-hidden mb-3">
                {pendingOnDate.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleComplete}
                    onEdit={setEditingTask}
                  />
                ))}
              </div>
            )}

            {/* Completed tasks for selected date (collapsible) */}
            {completedOnDate.length > 0 && (
              <CollapsibleSection
                title="Completed"
                count={completedOnDate.length}
                accentClass="text-text-secondary"
                defaultOpen={false}
              >
                <div className="bg-surface-card rounded-xl border border-border-card overflow-hidden mb-3">
                  {completedOnDate.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={handleComplete}
                      onEdit={setEditingTask}
                    />
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Empty state for selected date */}
            {tasksOnSelectedDate.length === 0 && overdueTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                <p className="font-heading text-sm font-semibold text-text-primary">
                  No tasks due on this day
                </p>
                <p className="font-body text-xs text-text-secondary max-w-xs">
                  Select another date to see your tasks.
                </p>
              </div>
            )}

            {tasksOnSelectedDate.length === 0 && overdueTasks.length > 0 && (
              <div className="py-6 text-center">
                <p className="font-body text-xs text-text-secondary">
                  No tasks due on this day.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Floating action button — create new task                           */}
      {/* ------------------------------------------------------------------ */}
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="fixed bottom-6 right-6 z-[85] w-14 h-14 rounded-full bg-accent-green hover:bg-accent-green-dark shadow-lg flex items-center justify-center transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-2"
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        aria-label="Add new task"
      >
        <Plus className="size-6 text-white" aria-hidden />
      </button>

      {/* ------------------------------------------------------------------ */}
      {/* Undo toast                                                          */}
      {/* ------------------------------------------------------------------ */}
      {pendingCompletion && (
        <UndoToast
          description={pendingCompletion.description}
          startTime={pendingCompletion.startTime}
          onUndo={handleUndo}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Create task modal                                                   */}
      {/* ------------------------------------------------------------------ */}
      {createOpen && (
        <CreateTaskModal
          initialDate={selectedDate.toISOString().slice(0, 10)}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Edit task modal                                                     */}
      {/* ------------------------------------------------------------------ */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
};
