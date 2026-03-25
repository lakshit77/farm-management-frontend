/**
 * AssigneePicker — multi-select user picker for task assignment.
 *
 * Fetches farm users via the `get_farm_users` RPC on mount and renders
 * a tappable list of avatars + names. Selected users are highlighted in
 * green. The current user is always shown first.
 *
 * When the RPC is unavailable (e.g. not yet created in Supabase), the
 * component shows a graceful fallback message.
 */

import React, { useEffect, useState, useCallback } from "react";
import { Loader2, UserCheck } from "lucide-react";
import { useTasks, type FarmUser } from "../../contexts/TaskContext";
import { useAuth } from "../../contexts/AuthContext";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return the user's initials from their display name or email (up to 2 chars).
 *
 * @param name - Display name or email string
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AssigneePickerProps {
  /** Currently selected user IDs. */
  selectedIds: Set<string>;
  /** Called whenever the selection changes with the new full set. */
  onChange: (selected: Set<string>) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a scrollable list of farm users that can be multi-selected as
 * task assignees. Fetches the user list from the `get_farm_users` RPC.
 */
export const AssigneePicker: React.FC<AssigneePickerProps> = ({
  selectedIds,
  onChange,
}) => {
  const { fetchFarmUsers } = useTasks();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<FarmUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [rpcError, setRpcError] = useState<boolean>(false);

  const loadUsers = useCallback(async (): Promise<void> => {
    setLoadingUsers(true);
    setRpcError(false);
    const result = await fetchFarmUsers();
    if (result.length === 0) {
      setRpcError(true);
    } else {
      // Put the current user first in the list
      const sorted = [...result].sort((a, b) => {
        if (a.id === currentUser?.id) return -1;
        if (b.id === currentUser?.id) return 1;
        return a.display_name.localeCompare(b.display_name);
      });
      setUsers(sorted);
    }
    setLoadingUsers(false);
  }, [fetchFarmUsers, currentUser?.id]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const toggleUser = (uid: string): void => {
    const next = new Set(selectedIds);
    if (next.has(uid)) {
      next.delete(uid);
    } else {
      next.add(uid);
    }
    onChange(next);
  };

  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center py-4 gap-2">
        <Loader2 className="size-4 animate-spin text-accent-green" aria-hidden />
        <span className="font-body text-xs text-text-secondary">Loading team members…</span>
      </div>
    );
  }

  if (rpcError) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
        <p className="font-body text-xs text-amber-700">
          Could not load team members. Make sure the{" "}
          <code className="font-mono bg-amber-100 px-1 rounded">get_farm_users</code>{" "}
          SQL function exists in your Supabase project.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-48 overflow-y-auto overscroll-contain rounded-xl border border-border-card bg-surface-card">
      {users.map((u) => {
        const isSelected = selectedIds.has(u.id);
        const isCurrentUser = u.id === currentUser?.id;
        const label = isCurrentUser ? `${u.display_name} (you)` : u.display_name;

        return (
          <button
            key={u.id}
            type="button"
            onClick={() => toggleUser(u.id)}
            aria-pressed={isSelected}
            aria-label={`${isSelected ? "Remove" : "Add"} ${label}`}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green border-b border-border-card/50 last:border-b-0 ${
              isSelected
                ? "bg-accent-green/8"
                : "hover:bg-background-primary"
            }`}
          >
            {/* Avatar circle */}
            <div
              className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-body text-xs font-bold transition-colors ${
                isSelected
                  ? "bg-accent-green text-white"
                  : "bg-border-card text-text-secondary"
              }`}
              aria-hidden
            >
              {getInitials(u.display_name)}
            </div>

            {/* Name + email */}
            <div className="flex-1 min-w-0">
              <p
                className={`font-body text-sm font-medium leading-tight truncate ${
                  isSelected ? "text-accent-green-dark" : "text-text-primary"
                }`}
              >
                {label}
              </p>
              {u.display_name !== u.email && (
                <p className="font-body text-xs text-text-secondary truncate leading-tight">
                  {u.email}
                </p>
              )}
            </div>

            {/* Check mark */}
            {isSelected && (
              <UserCheck
                className="size-4 shrink-0 text-accent-green"
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
