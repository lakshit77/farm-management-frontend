/**
 * ChatHeader — custom channel header for Stream Chat.
 *
 * Used in both mobile (with back button) and desktop (without).
 * Reads channel data from Stream's ChannelStateContext.
 */

import { useChannelStateContext } from "stream-chat-react";
import { ChevronLeft, Users, ShieldCheck, Bot } from "lucide-react";

interface ChatHeaderProps {
  onBack?: () => void;
  channelKey?: "all-team" | "admin" | "dm";
}

function ChannelAvatar({
  channelKey,
  size = "md",
}: {
  channelKey?: string;
  size?: "sm" | "md";
}) {
  const sz = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const iconSz = size === "sm" ? "size-4" : "size-5";

  if (channelKey === "admin") {
    return (
      <div className={`${sz} rounded-full bg-warm-orange-brown flex items-center justify-center shrink-0`}>
        <ShieldCheck className={`${iconSz} text-white`} />
      </div>
    );
  }
  if (channelKey === "dm") {
    return (
      <div className={`${sz} rounded-full bg-[#6B8FBD] flex items-center justify-center shrink-0`}>
        <Bot className={`${iconSz} text-white`} />
      </div>
    );
  }
  // all-team (default)
  return (
    <div className={`${sz} rounded-full bg-accent-green flex items-center justify-center shrink-0`}>
      <Users className={`${iconSz} text-white`} />
    </div>
  );
}

export function ChatHeader({ onBack, channelKey }: ChatHeaderProps) {
  const { channel } = useChannelStateContext();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelName: string =
    ((channel.data as any)?.name as string | undefined) ??
    (channelKey === "dm" ? "Personal Assistant" : channelKey === "admin" ? "Admin" : "All Team");

  const memberCount = Object.keys(channel.state?.members ?? {}).length;
  const subtitle =
    channelKey === "dm"
      ? "Personal AI Assistant"
      : `${memberCount} member${memberCount !== 1 ? "s" : ""}`;

  return (
    <div className="flex items-center gap-3 px-4 bg-white border-b border-border-card shadow-sm safe-area-top h-14 shrink-0">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-accent-green-dark hover:bg-background-primary active:bg-background-primary transition-colors touch-manipulation -ml-1"
          aria-label="Back to channels"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}

      <ChannelAvatar channelKey={channelKey} size={onBack ? "sm" : "md"} />

      <div className="flex-1 min-w-0">
        <p className="font-heading text-sm font-bold text-text-primary truncate leading-tight">
          {channelName}
        </p>
        <p className="font-body text-[11px] text-text-secondary leading-tight">
          {subtitle}
        </p>
      </div>

      {/* Online indicator */}
      <div className="shrink-0 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
        <span className="text-[11px] text-text-secondary font-body hidden sm:block">Active</span>
      </div>
    </div>
  );
}

// Standalone avatar export for use in channel list
export { ChannelAvatar };
