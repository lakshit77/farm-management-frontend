/**
 * ChatChannelList — polished channel list item for the sidebar/list screen.
 *
 * Shows avatar, channel name (bold if unread), last message preview,
 * relative timestamp, and unread count badge.
 */

import { Channel as StreamChannel } from "stream-chat";
import { ChannelAvatar } from "./ChatHeader";

type ChannelKey = "all-team" | "admin" | "dm";

interface ChannelEntry {
  key: ChannelKey;
  label: string;
  channel: StreamChannel | null;
}

interface ChatChannelListItemProps {
  entry: ChannelEntry;
  isActive: boolean;
  onClick: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(date: Date | string | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : (date as unknown as Date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getLastMessage(channel: StreamChannel | null): { text: string; time: string } {
  if (!channel) return { text: "No messages yet", time: "" };
  const messages = channel.state?.messages ?? [];
  if (messages.length === 0) return { text: "No messages yet", time: "" };
  const last = messages[messages.length - 1];
  const text = last.text ?? (last.attachments?.length ? "📎 Attachment" : "");
  return {
    text: text || "No messages yet",
    time: relativeTime(last.created_at as unknown as string | undefined),
  };
}

function getUnreadCount(channel: StreamChannel | null): number {
  if (!channel) return 0;
  return channel.countUnread() ?? 0;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ChatChannelListItem({ entry, isActive, onClick }: ChatChannelListItemProps) {
  const { text: lastMsg, time } = getLastMessage(entry.channel);
  const unread = getUnreadCount(entry.channel);
  const hasUnread = unread > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left touch-manipulation relative ${
        isActive
          ? "bg-accent-green/8 border-l-[3px] border-accent-green-dark"
          : "hover:bg-background-primary active:bg-background-primary border-l-[3px] border-transparent"
      }`}
    >
      {/* Avatar */}
      <ChannelAvatar channelKey={entry.key} size="md" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={`font-body text-sm truncate leading-tight ${
              hasUnread ? "font-semibold text-text-primary" : "font-medium text-text-primary"
            }`}
          >
            {entry.label}
          </p>
          {time && (
            <span
              className={`shrink-0 text-[11px] leading-tight ${
                hasUnread ? "text-accent-green-dark font-medium" : "text-text-secondary"
              }`}
            >
              {time}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="font-body text-xs text-text-secondary truncate leading-tight">
            {lastMsg}
          </p>
          {hasUnread && (
            <span className="shrink-0 min-w-[20px] h-5 flex items-center justify-center bg-accent-green-dark text-white text-[10px] font-bold rounded-full px-1.5">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export type { ChannelEntry, ChannelKey };
