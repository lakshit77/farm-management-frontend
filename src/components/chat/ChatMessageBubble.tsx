/**
 * ChatMessageBubble — custom message component for Stream Chat.
 *
 * Passed as the `Message` prop to <Channel>. Renders WhatsApp-style
 * bubbles: own messages right-aligned green, others left-aligned white,
 * bot messages in a subtle warm tint.
 */

import { MessageText, useMessageContext } from "stream-chat-react";
import { Bot } from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(date: Date | string | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : (date as unknown as Date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatMessageDate(date: Date | string | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : (date as unknown as Date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return formatTime(d);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const BOT_IDS = ["all-team-bot", "admin-bot", "personal-bot"];

// ── Component ──────────────────────────────────────────────────────────────────

export function ChatMessageBubble() {
  const { message, isMyMessage, groupStyles } = useMessageContext();

  const isOwn = isMyMessage();
  const isBot = BOT_IDS.includes(message.user?.id ?? "");
  const isFirst = groupStyles?.[0] === "top" || groupStyles?.[0] === "single";
  const isLast = groupStyles?.[0] === "bottom" || groupStyles?.[0] === "single";
  const time = formatMessageDate(message.created_at as unknown as string | undefined);
  const senderName = message.user?.name ?? message.user?.id ?? "";

  // Deleted messages
  if (message.type === "deleted") {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} px-4 py-0.5`}>
        <span className="text-xs text-text-secondary italic px-3 py-1.5 bg-background-primary rounded-2xl border border-border-card">
          This message was deleted
        </span>
      </div>
    );
  }

  // Bot messages — same layout as other users, warm tint colors
  if (isBot) {
    return (
      <div className={`flex justify-start px-4 ${isLast ? "pb-2" : "pb-0.5"}`}>
        <div className="flex items-end gap-2 max-w-[78%]">
          {/* Icon at bottom-left, same position as user avatar — only on last in group */}
          <div className="shrink-0 w-7 h-7 mb-0.5">
            {isLast && (
              <div className="w-7 h-7 rounded-full bg-warm-orange-brown/20 flex items-center justify-center">
                <Bot className="size-3.5 text-warm-rust" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div
              className={`bg-semantic-warning-bg border border-warm-orange-brown/20 px-3.5 py-2.5 shadow-sm ${
                isFirst && isLast
                  ? "rounded-2xl rounded-bl-md"
                  : isFirst
                  ? "rounded-2xl rounded-bl-sm"
                  : isLast
                  ? "rounded-2xl rounded-tl-sm rounded-bl-md"
                  : "rounded-lg rounded-l-sm"
              }`}
            >
              <p className="text-[11px] font-semibold text-warm-rust mb-1">
                {senderName}
              </p>
              <MessageText
                message={message}
                customWrapperClass="text-sm text-text-primary leading-relaxed whitespace-pre-wrap break-words"
                customInnerClass="text-sm text-text-primary leading-relaxed whitespace-pre-wrap break-words"
              />
              <p className="text-[10px] text-warm-rust/60 mt-1">{time}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Own messages — right-aligned green
  if (isOwn) {
    return (
      <div className={`flex justify-end px-4 ${isLast ? "pb-2" : "pb-0.5"}`}>
        <div className="max-w-[78%]">
          <div
            className={`bg-accent-green-dark px-3.5 py-2.5 shadow-sm ${
              isFirst && isLast
                ? "rounded-2xl rounded-br-md"
                : isFirst
                ? "rounded-2xl rounded-br-sm"
                : isLast
                ? "rounded-2xl rounded-tr-sm rounded-br-md"
                : "rounded-lg rounded-r-sm"
            }`}
          >
            <MessageText
              message={message}
              customWrapperClass="text-sm text-white leading-relaxed whitespace-pre-wrap break-words"
              customInnerClass="text-sm text-white leading-relaxed whitespace-pre-wrap break-words"
            />
            <div className="flex items-center justify-end gap-1 mt-1">
              <p className="text-[10px] text-white/60">{time}</p>
              {/* Read receipt tick */}
              <svg className="size-3 text-white/60" viewBox="0 0 16 11" fill="currentColor">
                <path d="M11.071.653a.75.75 0 0 1 .025 1.06l-6.5 7a.75.75 0 0 1-1.096-.01l-2.5-2.857A.75.75 0 1 1 2.125 4.9l1.957 2.237L9.986.678a.75.75 0 0 1 1.085-.025Z" />
                <path d="M14.071.653a.75.75 0 0 1 .025 1.06l-6.5 7a.75.75 0 0 1-1.085.025.75.75 0 0 0 1.085-.025l6.5-7a.75.75 0 0 0-.025-1.06Z" opacity=".5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Others' messages — left-aligned white
  return (
    <div className={`flex justify-start px-4 ${isLast ? "pb-2" : "pb-0.5"}`}>
      <div className="flex items-end gap-2 max-w-[78%]">
        {/* Avatar spacer — only show on last message in group */}
        <div className="shrink-0 w-7 h-7 mb-0.5">
          {isLast && (
            <div className="w-7 h-7 rounded-full bg-accent-green/20 flex items-center justify-center">
              <span className="text-[10px] font-bold text-accent-green-dark uppercase">
                {senderName.charAt(0)}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div
            className={`bg-white border border-border-card px-3.5 py-2.5 shadow-sm ${
              isFirst && isLast
                ? "rounded-2xl rounded-bl-md"
                : isFirst
                ? "rounded-2xl rounded-bl-sm"
                : isLast
                ? "rounded-2xl rounded-tl-sm rounded-bl-md"
                : "rounded-lg rounded-l-sm"
            }`}
          >
            {/* Sender name inside the bubble — always visible, like WhatsApp */}
            <p className="text-[11px] font-semibold text-accent-green-dark mb-1">
              {senderName}
            </p>
            <MessageText
              message={message}
              customWrapperClass="text-sm text-text-primary leading-relaxed whitespace-pre-wrap break-words"
              customInnerClass="text-sm text-text-primary leading-relaxed whitespace-pre-wrap break-words"
            />
            <p className="text-[10px] text-text-secondary mt-1">{time}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
