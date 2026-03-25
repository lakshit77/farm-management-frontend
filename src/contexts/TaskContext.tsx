/**
 * TaskContext — provides the current user's assigned tasks fetched from Supabase.
 *
 * All roles (admin, manager, employee) see only the tasks where they are
 * listed as an assignee in `task_assignees`. Consumers can refresh the list
 * and toggle an individual assignee status between pending and completed.
 *
 * Overdue is a derived concept: a task is overdue when its due_date is in the
 * past and the assignee status is not 'completed'.
 *
 * Recurring tasks: when all assignees mark a recurring task complete, the
 * tasks.due_date is shifted forward to the next cron occurrence and all
 * task_assignees rows for that task are reset to 'pending'.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { CronExpressionParser } from "cron-parser";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Allowed values for task_assignees.status */
export type AssigneeStatus = "pending" | "completed";

/** A task row joined from the tasks table. */
export interface TaskRow {
  id: string;
  description: string;
  due_date: string | null;
  is_recurring: boolean;
  recurrence_cron: string | null;
  created_at: string;
}

/** A task_assignees row joined with its parent task. */
export interface AssignedTask {
  /** task_assignees.id */
  id: string;
  /** task_assignees.status */
  assignee_status: AssigneeStatus;
  /** task_assignees.assigned_at */
  assigned_at: string;
  /** Joined task data */
  task: TaskRow;
  /**
   * Derived: true when due_date is in the past and assignee status is not
   * 'completed'.
   */
  isOverdue: boolean;
}

/** Input payload for creating a new task assigned to the current user. */
export interface CreateTaskInput {
  description: string;
  /** ISO string or null for no due date */
  due_date: string | null;
  is_recurring: boolean;
  /** Standard 5-field cron expression or null */
  recurrence_cron: string | null;
}

/** Input payload for updating an existing task's fields. */
export interface UpdateTaskInput {
  taskId: string;
  description: string;
  due_date: string | null;
  is_recurring: boolean;
  recurrence_cron: string | null;
}

interface TaskContextValue {
  /** List of tasks assigned to the current user, newest first. */
  tasks: AssignedTask[];
  loading: boolean;
  error: string | null;
  /** Number of tasks whose assignee status is not 'completed'. */
  pendingCount: number;
  /** Re-fetch tasks from Supabase. */
  fetchTasks: () => Promise<void>;
  /**
   * Toggle the current user's assignee status between pending and completed.
   * For recurring tasks that are being marked completed, the parent task's
   * due_date shifts to the next cron occurrence and all assignees are reset.
   *
   * @param assigneeId - task_assignees.id
   * @param newStatus  - The new status to set
   */
  updateAssigneeStatus: (
    assigneeId: string,
    newStatus: AssigneeStatus
  ) => Promise<void>;
  /**
   * Create a new task assigned to the current user.
   * Inserts a row in `tasks` then a row in `task_assignees`, then refreshes.
   *
   * @param input - Task description, optional due date, optional recurrence
   */
  createTask: (input: CreateTaskInput) => Promise<void>;
  /**
   * Update an existing task's description, due date, and recurrence settings.
   *
   * @param input - Updated task fields
   */
  updateTask: (input: UpdateTaskInput) => Promise<void>;
  /**
   * Delete a task and its assignee rows from Supabase, then refreshes.
   *
   * @param taskId - The tasks.id to delete
   */
  deleteTask: (taskId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the next occurrence date after `after` for a given cron expression.
 * Returns null if the expression is invalid or cannot be parsed.
 *
 * @param cronExpression - Standard 5-field cron (e.g. "0 9 * * 1")
 * @param after          - Compute next occurrence after this date (defaults to now)
 */
function getNextCronDate(
  cronExpression: string,
  after: Date = new Date()
): Date | null {
  try {
    const interval = CronExpressionParser.parse(cronExpression, {
      currentDate: after,
    });
    return interval.next().toDate();
  } catch {
    return null;
  }
}

/**
 * Derive the `isOverdue` flag for an assigned task.
 *
 * A task is overdue when:
 *  - The assignee status is not 'completed', AND
 *  - Either the due_date is missing (no deadline set) OR the due_date's
 *    UTC calendar date is strictly before today's UTC calendar date.
 *
 * We compare UTC dates only (not timestamps) so:
 *  - A task stored as 2026-03-25 00:00:00+00 is due TODAY, not overdue,
 *    regardless of local timezone (e.g. IST shifts it to 5:30 AM but it
 *    is still the same UTC date).
 *  - Tasks without a due_date are always shown in the Overdue section so
 *    they remain visible and actionable.
 */
function deriveIsOverdue(task: TaskRow, assigneeStatus: AssigneeStatus): boolean {
  if (assigneeStatus === "completed") return false;
  if (!task.due_date) return true;

  const due = new Date(task.due_date);
  const now = new Date();

  // Build UTC-date-only values for comparison (strip time)
  const dueUTCDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const todayUTCDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return dueUTCDay < todayUTCDay;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * TaskProvider fetches all task_assignees rows for the authenticated user,
 * joined with their parent task details. Wrap this inside AuthProvider so
 * `user` is always available when queries run.
 */
export function TaskProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<AssignedTask[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all task_assignees records for the current user joined with the
   * corresponding tasks row.
   */
  const fetchTasks = useCallback(async (): Promise<void> => {
    if (!user?.id) {
      setTasks([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("task_assignees")
        .select(
          "id, status, assigned_at, tasks(id, description, due_date, is_recurring, recurrence_cron, created_at)"
        )
        .eq("user_id", user.id)
        .order("assigned_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setTasks([]);
        return;
      }

      const mapped: AssignedTask[] = (data ?? []).map((row) => {
        // Supabase returns the joined `tasks` row as an object (not an array)
        // when selecting a foreign-key relation.
        const taskRow = Array.isArray(row.tasks) ? row.tasks[0] : row.tasks;
        const rawStatus = row.status as string;
        // Treat legacy 'acknowledged' rows as 'pending'
        const assigneeStatus: AssigneeStatus =
          rawStatus === "completed" ? "completed" : "pending";

        const typedTask: TaskRow = {
          id: (taskRow as TaskRow).id,
          description: (taskRow as TaskRow).description,
          due_date: (taskRow as TaskRow).due_date ?? null,
          is_recurring: (taskRow as TaskRow).is_recurring ?? false,
          recurrence_cron: (taskRow as TaskRow).recurrence_cron ?? null,
          created_at: (taskRow as TaskRow).created_at,
        };

        return {
          id: row.id as string,
          assignee_status: assigneeStatus,
          assigned_at: row.assigned_at as string,
          task: typedTask,
          isOverdue: deriveIsOverdue(typedTask, assigneeStatus),
        };
      });

      setTasks(mapped);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load tasks"
      );
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Toggle an assignee's status between pending and completed.
   *
   * For recurring tasks being marked completed:
   *  1. Compute the next due_date from the cron expression.
   *  2. Update tasks.due_date to the next occurrence.
   *  3. Reset all task_assignees rows for this task back to 'pending'.
   *
   * Uses optimistic updates for a snappy UI; reverts on failure.
   */
  const updateAssigneeStatus = useCallback(
    async (assigneeId: string, newStatus: AssigneeStatus): Promise<void> => {
      // Find the task being updated so we can inspect its recurrence info
      const target = tasks.find((t) => t.id === assigneeId);

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== assigneeId) return t;
          return {
            ...t,
            assignee_status: newStatus,
            isOverdue: deriveIsOverdue(t.task, newStatus),
          };
        })
      );

      const { error: updateError } = await supabase
        .from("task_assignees")
        .update({ status: newStatus })
        .eq("id", assigneeId);

      if (updateError) {
        await fetchTasks();
        setError(updateError.message);
        return;
      }

      // Handle recurring task completion: shift due_date and reset all assignees
      if (
        newStatus === "completed" &&
        target?.task.is_recurring &&
        target.task.recurrence_cron
      ) {
        const nextDate = getNextCronDate(
          target.task.recurrence_cron,
          target.task.due_date ? new Date(target.task.due_date) : new Date()
        );

        if (nextDate) {
          // Update the parent task's due_date
          const { error: dueDateError } = await supabase
            .from("tasks")
            .update({ due_date: nextDate.toISOString() })
            .eq("id", target.task.id);

          if (dueDateError) {
            setError(dueDateError.message);
          }

          // Reset all assignees of this task back to 'pending'
          const { error: resetError } = await supabase
            .from("task_assignees")
            .update({ status: "pending" })
            .eq("task_id", target.task.id);

          if (resetError) {
            setError(resetError.message);
          }
        }

        // Always refresh after recurring logic so UI reflects new state
        await fetchTasks();
        return;
      }

      // Non-recurring: just re-derive isOverdue for the updated task
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== assigneeId) return t;
          return {
            ...t,
            isOverdue: deriveIsOverdue(t.task, newStatus),
          };
        })
      );
    },
    [fetchTasks, tasks]
  );

  /**
   * Create a new task in `tasks`, then immediately assign it to the current
   * user via `task_assignees`, then refresh the task list.
   */
  const createTask = useCallback(
    async (input: CreateTaskInput): Promise<void> => {
      if (!user?.id) return;

      // Resolve farm_id from user metadata
      const farmId = (user.user_metadata?.farm_id as string) ?? null;

      // 1. Insert the task row
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .insert({
          description: input.description.trim(),
          due_date: input.due_date,
          is_recurring: input.is_recurring,
          recurrence_cron: input.recurrence_cron,
          created_by_id: user.id,
          farm_id: farmId,
        })
        .select("id")
        .single();

      if (taskError || !taskData) {
        setError(taskError?.message ?? "Failed to create task");
        return;
      }

      // 2. Assign to the current user
      const { error: assignError } = await supabase
        .from("task_assignees")
        .insert({
          task_id: taskData.id,
          user_id: user.id,
          status: "pending",
        });

      if (assignError) {
        setError(assignError.message);
        return;
      }

      // 3. Refresh so the new task appears immediately
      await fetchTasks();
    },
    [user, fetchTasks]
  );

  /**
   * Update an existing task row's mutable fields (description, due_date,
   * is_recurring, recurrence_cron), then refresh the task list.
   */
  const updateTask = useCallback(
    async (input: UpdateTaskInput): Promise<void> => {
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          description: input.description.trim(),
          due_date: input.due_date,
          is_recurring: input.is_recurring,
          recurrence_cron: input.recurrence_cron,
        })
        .eq("id", input.taskId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      await fetchTasks();
    },
    [fetchTasks]
  );

  /**
   * Delete a task and all its assignee records from Supabase, then refresh.
   * Assignee rows are deleted first to avoid FK constraint violations.
   */
  const deleteTask = useCallback(
    async (taskId: string): Promise<void> => {
      // Delete assignee rows first (FK constraint)
      const { error: assignError } = await supabase
        .from("task_assignees")
        .delete()
        .eq("task_id", taskId);

      if (assignError) {
        setError(assignError.message);
        return;
      }

      const { error: taskError } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (taskError) {
        setError(taskError.message);
        return;
      }

      await fetchTasks();
    },
    [fetchTasks]
  );

  // Fetch on mount and whenever the authenticated user changes.
  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const pendingCount = tasks.filter(
    (t) => t.assignee_status !== "completed"
  ).length;

  return (
    <TaskContext.Provider
      value={{ tasks, loading, error, pendingCount, fetchTasks, updateAssigneeStatus, createTask, updateTask, deleteTask }}
    >
      {children}
    </TaskContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the task context value. Must be used within a TaskProvider.
 */
export function useTasks(): TaskContextValue {
  const ctx = useContext(TaskContext);
  if (!ctx) {
    throw new Error("useTasks must be used within a TaskProvider");
  }
  return ctx;
}
