/**
 * ChatMessageBubble — custom message component for Stream Chat.
 *
 * WhatsApp-style bubbles with:
 *  - Own messages: right-aligned green
 *  - Others: left-aligned white
 *  - Bot messages: left-aligned warm tint
 *
 * Features:
 *  - @mention highlighting via renderText()
 *  - Inline quoted-message (reply) preview inside the bubble
 *  - Reaction emoji counts below the bubble
 *  - Hover action bar: quick-react (5 emojis) + Reply + More
 */

import React, { useState, useRef } from "react";
import {
  useMessageContext,
  useReactionHandler,
  renderText,
} from "stream-chat-react";
import { useMessageComposer } from "stream-chat-react";
import { Bot, Reply, SmilePlus } from "lucide-react";
import type { UserResponse, LocalMessage } from "stream-chat";

// ── Types ──────────────────────────────────────────────────────────────────────

interface MentionProps {
  children?: React.ReactNode;
  node: { mentionedUser: UserResponse };
}

interface ReactionCount {
  type: string;
  count: number;
  emoji: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BOT_IDS = ["all-team-bot", "admin-bot", "personal-bot"];

/** Quick-react options shown in the hover action bar. */
const QUICK_REACTIONS = [
  { type: "like", emoji: "👍" },
  { type: "love", emoji: "❤️" },
  { type: "haha", emoji: "😂" },
  { type: "wow", emoji: "😮" },
  { type: "sad", emoji: "😢" },
];

/** Maps Stream reaction type → display emoji. */
const REACTION_EMOJI: Record<string, string> = {
  like: "👍",
  love: "❤️",
  haha: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😠",
};

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

/** Extracts reaction counts from the message. */
function getReactionCounts(message: { reaction_counts?: Record<string, number> }): ReactionCount[] {
  const counts = message.reaction_counts ?? {};
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({
      type,
      count,
      emoji: REACTION_EMOJI[type] ?? "👍",
    }));
}

// ── Mention renderers ──────────────────────────────────────────────────────────

function OwnMention({ children }: MentionProps): React.ReactElement {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/20 text-white font-semibold text-[0.8em] leading-none mx-0.5">
      {children}
    </span>
  );
}

function OtherMention({ children }: MentionProps): React.ReactElement {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-accent-green/15 text-accent-green-dark font-semibold text-[0.8em] leading-none mx-0.5">
      {children}
    </span>
  );
}

function BotMention({ children }: MentionProps): React.ReactElement {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-warm-rust/15 text-warm-rust font-semibold text-[0.8em] leading-none mx-0.5">
      {children}
    </span>
  );
}

// ── QuotedPreview — inline reply block inside bubble ──────────────────────────

interface QuotedPreviewProps {
  /** The quoted message object from message.quoted_message */
  quoted: {
    text?: string;
    user?: { name?: string; id?: string };
  };
  isOwn: boolean;
}

/**
 * Renders the quoted (replied-to) message as a compact WhatsApp-style block
 * at the top of the bubble.
 */
function QuotedPreview({ quoted, isOwn }: QuotedPreviewProps): React.ReactElement {
  const author = quoted.user?.name ?? quoted.user?.id ?? "Unknown";
  const preview = (quoted.text ?? "").slice(0, 120) || "📎 Attachment";

  if (isOwn) {
    return (
      <div className="mb-2 pl-2 border-l-2 border-white/50 rounded-sm">
        <p className="text-[10px] font-semibold text-white/80 mb-0.5">{author}</p>
        <p className="text-[11px] text-white/70 leading-snug line-clamp-2">{preview}</p>
      </div>
    );
  }

  return (
    <div className="mb-2 pl-2 border-l-2 border-accent-green rounded-sm bg-accent-green/8 rounded-r-sm py-1 pr-1">
      <p className="text-[10px] font-semibold text-accent-green-dark mb-0.5">{author}</p>
      <p className="text-[11px] text-text-secondary leading-snug line-clamp-2">{preview}</p>
    </div>
  );
}

// ── ReactionPill row ───────────────────────────────────────────────────────────

interface ReactionsRowProps {
  reactions: ReactionCount[];
  ownReactionTypes: string[];
  onReact: (type: string) => void;
  isOwn: boolean;
}

/**
 * Renders the row of reaction pills below a bubble, matching WhatsApp style.
 */
function ReactionsRow({ reactions, ownReactionTypes, onReact, isOwn }: ReactionsRowProps): React.ReactElement | null {
  if (reactions.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
      {reactions.map((r) => {
        const isSelected = ownReactionTypes.includes(r.type);
        return (
          <button
            key={r.type}
            type="button"
            onClick={() => onReact(r.type)}
            className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all ${
              isSelected
                ? "bg-accent-green/20 border-accent-green text-accent-green-dark"
                : "bg-white border-border-card text-text-secondary hover:bg-background-primary"
            } shadow-sm`}
          >
            <span>{r.emoji}</span>
            <span>{r.count}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── HoverActionBar ─────────────────────────────────────────────────────────────

interface HoverActionBarProps {
  isOwn: boolean;
  onReact: (type: string) => void;
  onReply: () => void;
  showQuickReactions: boolean;
  setShowQuickReactions: (v: boolean) => void;
}

/**
 * The floating action bar that appears when hovering a message.
 * Shows quick-react emojis + Reply button. Positioned on the opposite side
 * from the bubble (own: left side; others: right side).
 */
function HoverActionBar({
  isOwn,
  onReact,
  onReply,
  showQuickReactions,
  setShowQuickReactions,
}: HoverActionBarProps): React.ReactElement {
  return (
    <div
      className={`flex items-center gap-1 self-center ${isOwn ? "mr-1" : "ml-1"}`}
      // Stop hover-out from closing the bar while interacting with it
      onMouseEnter={(e) => e.stopPropagation()}
    >
      {/* Quick reactions flyout */}
      {showQuickReactions && (
        <div className="flex items-center gap-0.5 bg-white border border-border-card rounded-full px-2 py-1 shadow-lg">
          {QUICK_REACTIONS.map((r) => (
            <button
              key={r.type}
              type="button"
              title={r.type}
              onClick={() => {
                onReact(r.type);
                setShowQuickReactions(false);
              }}
              className="text-base hover:scale-125 transition-transform p-0.5"
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}

      {/* Emoji-picker toggle */}
      <button
        type="button"
        title="React"
        onClick={() => setShowQuickReactions(!showQuickReactions)}
        className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-border-card text-text-secondary hover:text-accent-green hover:border-accent-green/40 shadow-sm transition-all"
      >
        <SmilePlus className="size-3.5" />
      </button>

      {/* Reply */}
      <button
        type="button"
        title="Reply"
        onClick={onReply}
        className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-border-card text-text-secondary hover:text-accent-green hover:border-accent-green/40 shadow-sm transition-all"
      >
        <Reply className="size-3.5" />
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * Renders a single chat message as a WhatsApp-style bubble.
 *
 * Hover to reveal the action bar (react / reply).
 * Reactions display as pill counts below the bubble.
 * Replies display as a quoted-message block inside the bubble.
 */
export function ChatMessageBubble(): React.ReactElement | null {
  const { message, isMyMessage, groupStyles } = useMessageContext();
  const handleReaction = useReactionHandler(message as unknown as LocalMessage);
  const messageComposer = useMessageComposer();

  const [hovered, setHovered] = useState(false);
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOwn = isMyMessage();
  const isBot = BOT_IDS.includes(message.user?.id ?? "");
  const isFirst = groupStyles?.[0] === "top" || groupStyles?.[0] === "single";
  const isLast = groupStyles?.[0] === "bottom" || groupStyles?.[0] === "single";
  const text = message.text ?? "";
  const mentionedUsers = (message.mentioned_users ?? []) as UserResponse[];
  const time = formatMessageDate(message.created_at as unknown as string | undefined);
  const senderName = message.user?.name ?? message.user?.id ?? "";
  const reactions = getReactionCounts(message as { reaction_counts?: Record<string, number> });
  const ownReactionTypes = (message.own_reactions ?? []).map((r) => r.type as string);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quotedMsg = (message as any).quoted_message as
    | { text?: string; user?: { name?: string; id?: string } }
    | undefined;

  function handleMouseEnter(): void {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHovered(true);
  }

  function handleMouseLeave(): void {
    hoverTimeout.current = setTimeout(() => {
      setHovered(false);
      setShowQuickReactions(false);
    }, 200);
  }

  function onReact(type: string): void {
    handleReaction(type);
  }

  function onReply(): void {
    messageComposer.setQuotedMessage(message as unknown as LocalMessage);
  }

  // ── Deleted ────────────────────────────────────────────────────────────────

  if (message.type === "deleted") {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} px-4 py-0.5`}>
        <span className="text-xs text-text-secondary italic px-3 py-1.5 bg-background-primary rounded-2xl border border-border-card">
          This message was deleted
        </span>
      </div>
    );
  }

  // ── Bubble shape util ──────────────────────────────────────────────────────

  function bubbleShape(side: "left" | "right"): string {
    if (side === "right") {
      if (isFirst && isLast) return "rounded-2xl rounded-br-md";
      if (isFirst) return "rounded-2xl rounded-br-sm";
      if (isLast) return "rounded-2xl rounded-tr-sm rounded-br-md";
      return "rounded-lg rounded-r-sm";
    }
    if (isFirst && isLast) return "rounded-2xl rounded-bl-md";
    if (isFirst) return "rounded-2xl rounded-bl-sm";
    if (isLast) return "rounded-2xl rounded-tl-sm rounded-bl-md";
    return "rounded-lg rounded-l-sm";
  }

  // ── Bot messages ───────────────────────────────────────────────────────────

  if (isBot) {
    return (
      <div
        className={`flex justify-start px-4 ${isLast ? "pb-2" : "pb-0.5"}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex items-end gap-1 max-w-[78%]">
          {/* Bot icon */}
          <div className="shrink-0 w-7 h-7 mb-0.5">
            {isLast && (
              <div className="w-7 h-7 rounded-full bg-warm-orange-brown/20 flex items-center justify-center">
                <Bot className="size-3.5 text-warm-rust" />
              </div>
            )}
          </div>

          {/* Bubble + reactions */}
          <div className="min-w-0">
            <div className={`bg-semantic-warning-bg border border-warm-orange-brown/20 px-3.5 py-2.5 shadow-sm ${bubbleShape("left")}`}>
              {quotedMsg && <QuotedPreview quoted={quotedMsg} isOwn={false} />}
              <p className="text-[11px] font-semibold text-warm-rust mb-1">{senderName}</p>
              <div className="text-sm text-text-primary leading-relaxed break-words chat-message-text">
                {renderText(text, mentionedUsers, { customMarkDownRenderers: { mention: BotMention } })}
              </div>
              <p className="text-[10px] text-warm-rust/60 mt-1">{time}</p>
            </div>
            <ReactionsRow
              reactions={reactions}
              ownReactionTypes={ownReactionTypes}
              onReact={onReact}
              isOwn={false}
            />
          </div>

          {/* Action bar */}
          {hovered && (
            <HoverActionBar
              isOwn={false}
              onReact={onReact}
              onReply={onReply}
              showQuickReactions={showQuickReactions}
              setShowQuickReactions={setShowQuickReactions}
            />
          )}
        </div>
      </div>
    );
  }

  // ── Own messages ───────────────────────────────────────────────────────────

  if (isOwn) {
    return (
      <div
        className={`flex justify-end px-4 ${isLast ? "pb-2" : "pb-0.5"}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex items-end gap-1 max-w-[78%]">
          {/* Action bar — to the LEFT of own bubbles */}
          {hovered && (
            <HoverActionBar
              isOwn={true}
              onReact={onReact}
              onReply={onReply}
              showQuickReactions={showQuickReactions}
              setShowQuickReactions={setShowQuickReactions}
            />
          )}

          {/* Bubble + reactions */}
          <div className="min-w-0">
            <div className={`bg-accent-green-dark px-3.5 py-2.5 shadow-sm ${bubbleShape("right")}`}>
              {quotedMsg && <QuotedPreview quoted={quotedMsg} isOwn={true} />}
              <div className="text-sm text-white leading-relaxed break-words chat-message-text">
                {renderText(text, mentionedUsers, { customMarkDownRenderers: { mention: OwnMention } })}
              </div>
              <div className="flex items-center justify-end gap-1 mt-1">
                <p className="text-[10px] text-white/60">{time}</p>
                {/* Read receipt ticks */}
                <svg className="size-3 text-white/60" viewBox="0 0 16 11" fill="currentColor">
                  <path d="M11.071.653a.75.75 0 0 1 .025 1.06l-6.5 7a.75.75 0 0 1-1.096-.01l-2.5-2.857A.75.75 0 1 1 2.125 4.9l1.957 2.237L9.986.678a.75.75 0 0 1 1.085-.025Z" />
                  <path d="M14.071.653a.75.75 0 0 1 .025 1.06l-6.5 7a.75.75 0 0 1-1.085.025.75.75 0 0 0 1.085-.025l6.5-7a.75.75 0 0 0-.025-1.06Z" opacity=".5" />
                </svg>
              </div>
            </div>
            <ReactionsRow
              reactions={reactions}
              ownReactionTypes={ownReactionTypes}
              onReact={onReact}
              isOwn={true}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Others' messages ───────────────────────────────────────────────────────

  return (
    <div
      className={`flex justify-start px-4 ${isLast ? "pb-2" : "pb-0.5"}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-end gap-1 max-w-[78%]">
        {/* Avatar */}
        <div className="shrink-0 w-7 h-7 mb-0.5">
          {isLast && (
            <div className="w-7 h-7 rounded-full bg-accent-green/20 flex items-center justify-center">
              <span className="text-[10px] font-bold text-accent-green-dark uppercase">
                {senderName.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Bubble + reactions */}
        <div className="min-w-0">
          <div className={`bg-white border border-border-card px-3.5 py-2.5 shadow-sm ${bubbleShape("left")}`}>
            {quotedMsg && <QuotedPreview quoted={quotedMsg} isOwn={false} />}
            <p className="text-[11px] font-semibold text-accent-green-dark mb-1">{senderName}</p>
            <div className="text-sm text-text-primary leading-relaxed break-words chat-message-text">
              {renderText(text, mentionedUsers, { customMarkDownRenderers: { mention: OtherMention } })}
            </div>
            <p className="text-[10px] text-text-secondary mt-1">{time}</p>
          </div>
          <ReactionsRow
            reactions={reactions}
            ownReactionTypes={ownReactionTypes}
            onReact={onReact}
            isOwn={false}
          />
        </div>

        {/* Action bar */}
        {hovered && (
          <HoverActionBar
            isOwn={false}
            onReact={onReact}
            onReply={onReply}
            showQuickReactions={showQuickReactions}
            setShowQuickReactions={setShowQuickReactions}
          />
        )}
      </div>
    </div>
  );
}
