/**
 * ChatMessageBubble — custom message component for Stream Chat.
 *
 * WhatsApp-style bubbles with:
 *  - Own messages: right-aligned green
 *  - Others: left-aligned white
 *  - Bot messages: left-aligned warm tint
 *
 * Desktop interactions (mouse):
 *  - Hover reveals a compact action bar beside the bubble
 *  - Reaction flyout is absolutely-positioned so it never affects layout
 *
 * Mobile interactions (touch):
 *  - Long press → bottom sheet with emoji reactions + Reply
 *  - Swipe left  → reply directly (like WhatsApp)
 *
 * Bot action buttons:
 *  - Bot messages may include a `custom.actions` array in the Stream message.
 *  - BotActionButtons renders a generic, configurable row of buttons below the
 *    bot bubble text.  Each button has an id, label, and optional style.
 *  - On click the component sends an action_reply message and persistently marks
 *    the original bot message as answered via channel.updateMessage(), so the
 *    disabled state survives refresh and works across all devices.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  useMessageContext,
  useReactionHandler,
  useChannelStateContext,
  useChatContext,
  renderText,
} from "stream-chat-react";
import { useMessageComposer } from "stream-chat-react";
import { Bot, Reply, X, Check, Loader2 } from "lucide-react";
import type { UserResponse, LocalMessage, Message, MessageResponse } from "stream-chat";

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

const QUICK_REACTIONS = [
  { type: "like",  emoji: "👍" },
  { type: "love",  emoji: "❤️" },
  { type: "haha",  emoji: "😂" },
  { type: "wow",   emoji: "😮" },
  { type: "sad",   emoji: "😢" },
];

const REACTION_EMOJI: Record<string, string> = {
  like: "👍", love: "❤️", haha: "😂", wow: "😮", sad: "😢", angry: "😠",
};

/** Minimum horizontal swipe distance (px) to trigger reply. */
const SWIPE_REPLY_THRESHOLD = 60;

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

function getReactionCounts(message: { reaction_counts?: Record<string, number> }): ReactionCount[] {
  const counts = message.reaction_counts ?? {};
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({ type, count, emoji: REACTION_EMOJI[type] ?? "👍" }));
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

// ── QuotedPreview ─────────────────────────────────────────────────────────────

interface QuotedPreviewProps {
  quoted: { text?: string; user?: { name?: string; id?: string } };
  isOwn: boolean;
}

function QuotedPreview({ quoted, isOwn }: QuotedPreviewProps): React.ReactElement {
  const author  = quoted.user?.name ?? quoted.user?.id ?? "Unknown";
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
    <div className="mb-2 pl-2 border-l-2 border-accent-green bg-accent-green/[0.07] rounded-r-sm py-1 pr-1">
      <p className="text-[10px] font-semibold text-accent-green-dark mb-0.5">{author}</p>
      <p className="text-[11px] text-text-secondary leading-snug line-clamp-2">{preview}</p>
    </div>
  );
}

// ── ReactionsRow ──────────────────────────────────────────────────────────────

interface ReactionsRowProps {
  reactions: ReactionCount[];
  ownReactionTypes: string[];
  onReact: (type: string) => void;
  isOwn: boolean;
}

function ReactionsRow({ reactions, ownReactionTypes, onReact, isOwn }: ReactionsRowProps): React.ReactElement | null {
  if (reactions.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
      {reactions.map((r) => {
        const selected = ownReactionTypes.includes(r.type);
        return (
          <button
            key={r.type}
            type="button"
            onClick={() => onReact(r.type)}
            className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all shadow-sm ${
              selected
                ? "bg-accent-green/20 border-accent-green text-accent-green-dark"
                : "bg-white border-border-card text-text-secondary hover:bg-background-primary"
            }`}
          >
            <span>{r.emoji}</span>
            <span>{r.count}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Desktop HoverActionBar ────────────────────────────────────────────────────

interface HoverActionBarProps {
  isOwn: boolean;
  onReact: (type: string) => void;
  onReply: () => void;
  showQuickReactions: boolean;
  setShowQuickReactions: (v: boolean) => void;
}

/**
 * Shown on mouse-hover (desktop only). The quick-reaction flyout is absolutely
 * positioned so it floats above the bar without pushing any content around.
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
      className={`relative flex items-center gap-1 self-center ${isOwn ? "mr-1" : "ml-1"}`}
      onMouseEnter={(e) => e.stopPropagation()}
    >
      {/* Quick-reaction flyout — absolutely positioned, never in flow */}
      {showQuickReactions && (
        <div
          className={`absolute bottom-full mb-1.5 flex items-center gap-0.5 bg-white border border-border-card rounded-full px-2 py-1.5 shadow-xl z-50 ${
            isOwn ? "right-0" : "left-0"
          }`}
          style={{ whiteSpace: "nowrap" }}
        >
          {QUICK_REACTIONS.map((r) => (
            <button
              key={r.type}
              type="button"
              title={r.type}
              onClick={() => { onReact(r.type); setShowQuickReactions(false); }}
              className="text-lg hover:scale-125 transition-transform p-0.5 leading-none"
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}

      {/* Smile toggle */}
      <button
        type="button"
        title="React"
        onClick={() => setShowQuickReactions(!showQuickReactions)}
        className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-border-card text-text-secondary hover:text-accent-green hover:border-accent-green/40 shadow-sm transition-all"
      >
        {/* Smiley face SVG — avoids any icon size mismatch */}
        <svg viewBox="0 0 20 20" fill="none" className="size-3.5" stroke="currentColor" strokeWidth="1.6">
          <circle cx="10" cy="10" r="8" />
          <path d="M7 11.5c.5 1.5 5.5 1.5 6 0" strokeLinecap="round" />
          <circle cx="7.5" cy="8.5" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="12.5" cy="8.5" r="0.8" fill="currentColor" stroke="none" />
        </svg>
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

// ── Mobile bottom-sheet ───────────────────────────────────────────────────────

interface MobileActionSheetProps {
  onReact: (type: string) => void;
  onReply: () => void;
  onClose: () => void;
  ownReactionTypes: string[];
}

/**
 * WhatsApp-style bottom sheet shown after a long press on mobile.
 * Emoji row on top, then a Reply row below.
 */
function MobileActionSheet({ onReact, onReply, onClose, ownReactionTypes }: MobileActionSheetProps): React.ReactElement {
  // Close on backdrop tap
  useEffect(() => {
    const handler = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-action-sheet]")) return;
      onClose();
    };
    document.addEventListener("touchstart", handler);
    return () => document.removeEventListener("touchstart", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[300] flex items-end" style={{ background: "rgba(0,0,0,0.35)" }}>
      <div
        data-action-sheet
        className="w-full bg-white rounded-t-2xl pb-safe animate-slide-up"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border-card" />
        </div>

        {/* Emoji reactions row */}
        <div className="flex items-center justify-around px-6 py-3 border-b border-border-card/50">
          {QUICK_REACTIONS.map((r) => {
            const selected = ownReactionTypes.includes(r.type);
            return (
              <button
                key={r.type}
                type="button"
                onClick={() => { onReact(r.type); onClose(); }}
                className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all active:scale-90 ${
                  selected ? "bg-accent-green/15" : ""
                }`}
              >
                <span className="text-2xl leading-none">{r.emoji}</span>
                {selected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-green block" />
                )}
              </button>
            );
          })}
        </div>

        {/* Reply row */}
        <button
          type="button"
          onClick={() => { onReply(); onClose(); }}
          className="flex items-center gap-3 w-full px-6 py-4 text-text-primary active:bg-background-primary transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-background-primary flex items-center justify-center">
            <Reply className="size-4 text-accent-green-dark" />
          </div>
          <span className="font-body text-sm font-medium">Reply</span>
        </button>

        {/* Cancel */}
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-3 w-full px-6 py-4 text-text-secondary active:bg-background-primary transition-colors border-t border-border-card/50"
        >
          <div className="w-9 h-9 rounded-full bg-background-primary flex items-center justify-center">
            <X className="size-4 text-text-secondary" />
          </div>
          <span className="font-body text-sm">Cancel</span>
        </button>
      </div>
    </div>
  );
}

// ── Action Buttons ─────────────────────────────────────────────────────────────

/**
 * A single action button definition sent by the bot via message.custom.actions.
 *
 * @property id     - Machine identifier forwarded to n8n when clicked.
 * @property label  - Human-readable text shown on the button (anything).
 * @property style  - Visual variant: "primary" | "secondary" | "danger".
 *                    Defaults to "primary" if omitted.
 */
interface ActionButton {
  id: string;
  label: string;
  style?: "primary" | "secondary" | "danger";
}

interface BotActionButtonsProps {
  /** All buttons to render. */
  actions: ActionButton[];
  /** Opaque context blob forwarded unchanged to n8n on click. */
  actionContext?: Record<string, unknown>;
  /** Stream message id of the bot message that carries these buttons. */
  sourceMessageId: string;
  /** True when the user has already submitted a choice. Buttons are disabled. */
  answered: boolean;
  /** The id of the button the user chose (only meaningful when answered=true). */
  selectedActionId?: string;
}

/** Tailwind classes for each button style in the active (clickable) state. */
const STYLE_ACTIVE: Record<string, string> = {
  primary:   "bg-accent-green-dark text-white hover:opacity-90",
  secondary: "bg-white border border-border-card text-text-secondary hover:bg-background-primary",
  danger:    "bg-red-500 text-white hover:bg-red-600",
};

/** Tailwind classes for the selected button in the answered state. */
const STYLE_SELECTED: Record<string, string> = {
  primary:   "bg-accent-green-dark/20 border border-accent-green-dark text-accent-green-dark",
  secondary: "bg-background-primary border border-accent-green-dark text-accent-green-dark",
  danger:    "bg-red-100 border border-red-500 text-red-600",
};

/**
 * Renders a row of generic action buttons below a bot bubble.
 *
 * On click:
 *  1. Sends a new channel message with custom.action_reply so n8n can process it.
 *  2. Updates the original bot message via channel.updateMessage() to mark it as
 *     answered.  This persists the disabled state across refresh and devices.
 *
 * The buttons are permanently disabled once answered (no re-clicking allowed).
 */
function BotActionButtons({
  actions,
  actionContext,
  sourceMessageId,
  answered,
  selectedActionId,
}: BotActionButtonsProps): React.ReactElement | null {
  const { channel } = useChannelStateContext("BotActionButtons");
  const { client } = useChatContext("BotActionButtons");
  const [submitting, setSubmitting] = useState<string | null>(null);

  if (actions.length === 0) return null;

  async function handleClick(btn: ActionButton): Promise<void> {
    if (answered || submitting) return;
    setSubmitting(btn.id);
    try {
      await Promise.all([
        // 1. Send the user's reply — triggers the webhook → n8n pipeline.
        // Cast to unknown first because Stream's Message type does not expose
        // `custom` directly (it lives on CustomMessageData which is empty by
        // default); the field is still sent and stored by the server.
        channel.sendMessage({
          text: btn.label,
          custom: {
            action_reply: {
              action_id: btn.id,
              action_context: actionContext ?? {},
              source_message_id: sourceMessageId,
            },
          },
        } as unknown as Message),
        // 2. Persistently mark the original bot message as answered so the
        //    disabled state survives refresh and is shared across all devices.
        //    client.updateMessage() is used because Channel has no such method.
        client.updateMessage({
          id: sourceMessageId,
          custom: {
            actions,
            action_context: actionContext ?? {},
            actions_answered: true,
            selected_action_id: btn.id,
          },
        } as Partial<MessageResponse>),
      ]);
    } catch (err) {
      console.error("[BotActionButtons] failed to submit action:", err);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2.5">
      {actions.map((btn) => {
        const style = btn.style ?? "primary";
        const isSelected = answered && selectedActionId === btn.id;
        const isOther = answered && selectedActionId !== btn.id;
        const isSubmittingThis = submitting === btn.id;
        const isDisabled = answered || submitting !== null;

        let className =
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all focus:outline-none ";

        if (isOther) {
          className += "opacity-30 cursor-not-allowed bg-white border border-border-card text-text-secondary";
        } else if (isSelected) {
          className += STYLE_SELECTED[style] ?? STYLE_SELECTED.primary;
        } else {
          className += STYLE_ACTIVE[style] ?? STYLE_ACTIVE.primary;
          if (isDisabled) className += " opacity-60 cursor-not-allowed";
        }

        return (
          <button
            key={btn.id}
            type="button"
            disabled={isDisabled}
            onClick={() => handleClick(btn)}
            className={className}
            aria-pressed={isSelected}
          >
            {isSubmittingThis && (
              <Loader2 className="size-3 animate-spin shrink-0" />
            )}
            {isSelected && !isSubmittingThis && (
              <Check className="size-3 shrink-0" />
            )}
            {btn.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * Renders a single chat message as a WhatsApp-style bubble.
 *
 * Desktop: hover → action bar (absolutely-positioned flyout for reactions).
 * Mobile:  long-press → bottom sheet; swipe-left → reply.
 */
export function ChatMessageBubble(): React.ReactElement | null {
  const { message, isMyMessage, groupStyles } = useMessageContext();
  const handleReaction = useReactionHandler(message as unknown as LocalMessage);
  const messageComposer = useMessageComposer();

  // True on touch-primary devices — hover bar is hidden, mobile gestures used instead.
  const isTouch = typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;

  // Desktop hover state (unused on touch devices)
  const [hovered, setHovered] = useState(false);
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mobile state
  const [showSheet, setShowSheet] = useState(false);
  const longPressTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const isSwiping = useRef(false);

  // Clear all pending timeouts on unmount to prevent state updates on
  // unmounted components. With virtual scrolling, messages mount/unmount
  // frequently, making this cleanup critical.
  useEffect(() => {
    return () => {
      if (hoverTimeout.current)    clearTimeout(hoverTimeout.current);
      if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    };
  }, []);

  const isOwn = isMyMessage();
  const isBot  = BOT_IDS.includes(message.user?.id ?? "");
  const isFirst = groupStyles?.[0] === "top"    || groupStyles?.[0] === "single";
  const isLast  = groupStyles?.[0] === "bottom" || groupStyles?.[0] === "single";

  const text          = message.text ?? "";
  const mentionedUsers = (message.mentioned_users ?? []) as UserResponse[];
  const time          = formatMessageDate(message.created_at as unknown as string | undefined);
  const senderName    = message.user?.name ?? message.user?.id ?? "";
  const reactions     = getReactionCounts(message as { reaction_counts?: Record<string, number> });
  const ownReactionTypes = (message.own_reactions ?? []).map((r) => r.type as string);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quotedMsg = (message as any).quoted_message as
    | { text?: string; user?: { name?: string; id?: string } }
    | undefined;

  // ── Action buttons (from bot messages with custom.actions) ──────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messageCustom = (message as any).custom as Record<string, any> | undefined;
  const botActions = (messageCustom?.actions ?? []) as ActionButton[];
  const actionsAnswered = messageCustom?.actions_answered === true;
  const selectedActionId = messageCustom?.selected_action_id as string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actionContext = messageCustom?.action_context as Record<string, unknown> | undefined;

  // ── Desktop mouse handlers ──────────────────────────────────────────────────

  function handleMouseEnter(): void {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHovered(true);
  }
  function handleMouseLeave(): void {
    hoverTimeout.current = setTimeout(() => {
      setHovered(false);
      setShowQuickReactions(false);
    }, 150);
  }

  // ── Mobile touch handlers ───────────────────────────────────────────────────

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    isSwiping.current = false;
    setSwipeOffset(0);

    // Long press — fire after 500ms if no move
    longPressTimeout.current = setTimeout(() => {
      setShowSheet(true);
    }, 500);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = Math.abs(t.clientY - touchStartY.current);

    // Cancel long press if user is scrolling or swiping
    if (Math.abs(dx) > 8 || dy > 8) {
      if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    }

    // Track right swipe only (dx > 0)
    if (dx > 10 && dy < 30) {
      isSwiping.current = true;
      // Clamp offset to max SWIPE_REPLY_THRESHOLD
      setSwipeOffset(Math.min(dx, SWIPE_REPLY_THRESHOLD));
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);

    if (isSwiping.current && swipeOffset >= (SWIPE_REPLY_THRESHOLD * 0.75)) {
      messageComposer.setQuotedMessage(message as unknown as LocalMessage);
    }
    isSwiping.current = false;
    setSwipeOffset(0);
  }, [swipeOffset, message, messageComposer]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function onReact(type: string): void { handleReaction(type); }
  function onReply(): void { messageComposer.setQuotedMessage(message as unknown as LocalMessage); }

  function bubbleShape(side: "left" | "right"): string {
    if (side === "right") {
      if (isFirst && isLast) return "rounded-2xl rounded-br-md";
      if (isFirst)           return "rounded-2xl rounded-br-sm";
      if (isLast)            return "rounded-2xl rounded-tr-sm rounded-br-md";
      return "rounded-lg rounded-r-sm";
    }
    if (isFirst && isLast) return "rounded-2xl rounded-bl-md";
    if (isFirst)           return "rounded-2xl rounded-bl-sm";
    if (isLast)            return "rounded-2xl rounded-tl-sm rounded-bl-md";
    return "rounded-lg rounded-l-sm";
  }

  // ── Swipe reply indicator ───────────────────────────────────────────────────
  // Shows a small reply icon that appears as the user swipes left
  const swipeProgress = Math.min(Math.abs(swipeOffset) / SWIPE_REPLY_THRESHOLD, 1);
  const showSwipeHint = swipeOffset > 10;

  // ── Deleted ─────────────────────────────────────────────────────────────────

  if (message.type === "deleted") {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} px-4 py-0.5`}>
        <span className="text-xs text-text-secondary italic px-3 py-1.5 bg-background-primary rounded-2xl border border-border-card">
          This message was deleted
        </span>
      </div>
    );
  }

  // ── Shared touch props ──────────────────────────────────────────────────────
  const touchProps = {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };

  // ── Bot messages ────────────────────────────────────────────────────────────

  if (isBot) {
    return (
      <>
        {showSheet && (
          <MobileActionSheet
            onReact={onReact}
            onReply={onReply}
            onClose={() => setShowSheet(false)}
            ownReactionTypes={ownReactionTypes}
          />
        )}
        <div
          className={`flex justify-start px-4 ${isLast ? "pb-2" : "pb-0.5"}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          {...touchProps}
        >
          <div className="flex items-end gap-1 max-w-[78%]">
            {/* Swipe-reply hint — left of bubble (swipe right reveals it) */}
            {showSwipeHint && (
              <div
                className="flex items-center justify-center self-center mr-1 transition-opacity"
                style={{ opacity: swipeProgress }}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  swipeProgress >= 0.75 ? "bg-accent-green text-white" : "bg-border-card text-text-secondary"
                }`}>
                  <Reply className="size-3.5" />
                </div>
              </div>
            )}

            {/* Bot icon */}
            <div className="shrink-0 w-7 h-7 mb-0.5">
              {isLast && (
                <div className="w-7 h-7 rounded-full bg-warm-orange-brown/20 flex items-center justify-center">
                  <Bot className="size-3.5 text-warm-rust" />
                </div>
              )}
            </div>

            {/* Bubble */}
            <div
              className="min-w-0 transition-transform duration-100"
              style={{ transform: `translateX(${swipeOffset}px)` }}
            >
              <div className={`bg-semantic-warning-bg border border-warm-orange-brown/20 px-3.5 py-2.5 shadow-sm ${bubbleShape("left")}`}>
                {quotedMsg && <QuotedPreview quoted={quotedMsg} isOwn={false} />}
                <p className="text-[11px] font-semibold text-warm-rust mb-1">{senderName}</p>
                <div className="text-sm text-text-primary leading-relaxed break-words chat-message-text">
                  {renderText(text, mentionedUsers, { customMarkDownRenderers: { mention: BotMention } })}
                </div>
                {botActions.length > 0 && (
                  <BotActionButtons
                    actions={botActions}
                    actionContext={actionContext}
                    sourceMessageId={message.id ?? ""}
                    answered={actionsAnswered}
                    selectedActionId={selectedActionId}
                  />
                )}
                <p className="text-[10px] text-warm-rust/60 mt-1">{time}</p>
              </div>
              <ReactionsRow reactions={reactions} ownReactionTypes={ownReactionTypes} onReact={onReact} isOwn={false} />
            </div>

            {/* Desktop action bar — hidden on touch devices */}
            {!isTouch && hovered && (
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
      </>
    );
  }

  // ── Own messages ─────────────────────────────────────────────────────────────

  if (isOwn) {
    return (
      <>
        {showSheet && (
          <MobileActionSheet
            onReact={onReact}
            onReply={onReply}
            onClose={() => setShowSheet(false)}
            ownReactionTypes={ownReactionTypes}
          />
        )}
        <div
          className={`flex justify-end px-4 ${isLast ? "pb-2" : "pb-0.5"}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          {...touchProps}
        >
          <div className="flex items-end gap-1 max-w-[78%]">
            {/* Swipe-reply hint — appears to the left */}
            {showSwipeHint && (
              <div
                className="flex items-center justify-center self-center mr-1 transition-opacity"
                style={{ opacity: swipeProgress }}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  swipeProgress >= 0.75 ? "bg-accent-green text-white" : "bg-border-card text-text-secondary"
                }`}>
                  <Reply className="size-3.5" />
                </div>
              </div>
            )}

            {/* Desktop action bar — hidden on touch devices */}
            {!isTouch && hovered && (
              <HoverActionBar
                isOwn={true}
                onReact={onReact}
                onReply={onReply}
                showQuickReactions={showQuickReactions}
                setShowQuickReactions={setShowQuickReactions}
              />
            )}

            {/* Bubble */}
            <div
              className="min-w-0 transition-transform duration-100"
              style={{ transform: `translateX(${swipeOffset}px)` }}
            >
              <div className={`bg-accent-green-dark px-3.5 py-2.5 shadow-sm ${bubbleShape("right")}`}>
                {quotedMsg && <QuotedPreview quoted={quotedMsg} isOwn={true} />}
                <div className="text-sm text-white leading-relaxed break-words chat-message-text">
                  {renderText(text, mentionedUsers, { customMarkDownRenderers: { mention: OwnMention } })}
                </div>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <p className="text-[10px] text-white/60">{time}</p>
                  <svg className="size-3 text-white/60" viewBox="0 0 16 11" fill="currentColor">
                    <path d="M11.071.653a.75.75 0 0 1 .025 1.06l-6.5 7a.75.75 0 0 1-1.096-.01l-2.5-2.857A.75.75 0 1 1 2.125 4.9l1.957 2.237L9.986.678a.75.75 0 0 1 1.085-.025Z" />
                    <path d="M14.071.653a.75.75 0 0 1 .025 1.06l-6.5 7a.75.75 0 0 1-1.085.025.75.75 0 0 0 1.085-.025l6.5-7a.75.75 0 0 0-.025-1.06Z" opacity=".5" />
                  </svg>
                </div>
              </div>
              <ReactionsRow reactions={reactions} ownReactionTypes={ownReactionTypes} onReact={onReact} isOwn={true} />
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Others' messages ──────────────────────────────────────────────────────

  return (
    <>
      {showSheet && (
        <MobileActionSheet
          onReact={onReact}
          onReply={onReply}
          onClose={() => setShowSheet(false)}
          ownReactionTypes={ownReactionTypes}
        />
      )}
      <div
        className={`flex justify-start px-4 ${isLast ? "pb-2" : "pb-0.5"}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...touchProps}
      >
        <div className="flex items-end gap-1 max-w-[78%]">
          {/* Swipe-reply hint — left of bubble (swipe right reveals it) */}
          {showSwipeHint && (
            <div
              className="flex items-center justify-center self-center mr-1 transition-opacity"
              style={{ opacity: swipeProgress }}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                swipeProgress >= 0.75 ? "bg-accent-green text-white" : "bg-border-card text-text-secondary"
              }`}>
                <Reply className="size-3.5" />
              </div>
            </div>
          )}

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

          {/* Bubble */}
          <div
            className="min-w-0 transition-transform duration-100"
            style={{ transform: `translateX(${swipeOffset}px)` }}
          >
            <div className={`bg-white border border-border-card px-3.5 py-2.5 shadow-sm ${bubbleShape("left")}`}>
              {quotedMsg && <QuotedPreview quoted={quotedMsg} isOwn={false} />}
              <p className="text-[11px] font-semibold text-accent-green-dark mb-1">{senderName}</p>
              <div className="text-sm text-text-primary leading-relaxed break-words chat-message-text">
                {renderText(text, mentionedUsers, { customMarkDownRenderers: { mention: OtherMention } })}
              </div>
              <p className="text-[10px] text-text-secondary mt-1">{time}</p>
            </div>
            <ReactionsRow reactions={reactions} ownReactionTypes={ownReactionTypes} onReact={onReact} isOwn={false} />
          </div>

          {/* Desktop action bar — hidden on touch devices */}
          {!isTouch && hovered && (
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
    </>
  );
}
