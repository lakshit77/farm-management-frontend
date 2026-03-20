/**
 * ChatInput — custom message input bar for Stream Chat v13.
 *
 * Uses Stream's TextareaComposer so that @mention autocomplete works out-of-the-box
 * (the SDK auto-registers the MentionsMiddleware which queries channel members and
 * attaches `mentioned_users` metadata to every sent message).
 *
 * When a quoted message is set (via messageComposer.setQuotedMessage), a
 * WhatsApp-style reply preview bar is shown above the text input.
 *
 * Emoji picker via emoji-mart is kept alongside.
 */

import React, { useRef, useState, useEffect } from "react";
import {
  useMessageInputContext,
  useMessageComposer,
  useStateStore,
  TextareaComposer,
} from "stream-chat-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { Send, Smile, X, Reply } from "lucide-react";
import type { LocalMessageBase } from "stream-chat";

// ── Selectors ──────────────────────────────────────────────────────────────────

function textSelector(state: { text?: string }): { text: string } {
  return { text: state.text ?? "" };
}

function composerSelector(state: { quotedMessage: LocalMessageBase | null }): {
  quotedMessage: LocalMessageBase | null;
} {
  return { quotedMessage: state.quotedMessage ?? null };
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface EmojiData {
  native: string;
}

// ── ReplyPreviewBar ────────────────────────────────────────────────────────────

interface ReplyPreviewBarProps {
  quotedMessage: LocalMessageBase;
  onCancel: () => void;
}

/**
 * WhatsApp-style bar above the input showing the message being replied to.
 */
function ReplyPreviewBar({ quotedMessage, onCancel }: ReplyPreviewBarProps): React.ReactElement {
  const author = quotedMessage.user?.name ?? quotedMessage.user?.id ?? "Unknown";
  const preview = (quotedMessage.text ?? "").slice(0, 100) || "📎 Attachment";

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-background-primary border-t border-border-card">
      <Reply className="size-3.5 text-accent-green shrink-0" />
      <div className="flex-1 min-w-0 pl-2 border-l-2 border-accent-green">
        <p className="text-[11px] font-semibold text-accent-green-dark truncate">{author}</p>
        <p className="text-[11px] text-text-secondary truncate">{preview}</p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-border-card text-text-secondary hover:text-text-primary transition-colors"
        aria-label="Cancel reply"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * Renders the message-input bar.
 *
 * Wraps Stream's TextareaComposer (handles @mention suggestions, text state) and
 * adds an emoji picker, send button, and reply preview bar.
 */
export function ChatInput(): React.ReactElement {
  const { handleSubmit, textareaRef } = useMessageInputContext("ChatInput");
  const messageComposer = useMessageComposer();
  const { text } = useStateStore(messageComposer.textComposer.state, textSelector);
  const { quotedMessage } = useStateStore(messageComposer.state, composerSelector);

  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  const hasText = text.trim().length > 0;

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    }
    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPicker]);

  /**
   * Inserts an emoji at the current cursor position via the composer API so
   * that the text state remains in sync with Stream's internal tracking.
   */
  function onEmojiSelect(emoji: EmojiData): void {
    const ta = (textareaRef as React.RefObject<HTMLTextAreaElement>).current;
    const cursorPos = ta?.selectionStart ?? text.length;
    const newText = text.slice(0, cursorPos) + emoji.native + text.slice(cursorPos);
    const newCursor = cursorPos + emoji.native.length;
    messageComposer.textComposer.handleChange({
      text: newText,
      selection: { start: newCursor, end: newCursor },
    });
    setTimeout(() => {
      if (ta) {
        ta.focus();
        ta.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (hasText) handleSubmit();
    }
    // Escape clears the reply
    if (e.key === "Escape" && quotedMessage) {
      messageComposer.setQuotedMessage(null);
    }
  }

  return (
    <div className="flex flex-col bg-white border-t border-border-card">
      {/* Reply preview bar — shown when replying to a message */}
      {quotedMessage && (
        <ReplyPreviewBar
          quotedMessage={quotedMessage}
          onCancel={() => messageComposer.setQuotedMessage(null)}
        />
      )}

      {/*
       * Input row.
       * This outer div is the positioning context for both the emoji picker and
       * the @mention suggestion list. It must NOT clip overflow.
       */}
      <div
        className="relative flex items-center gap-2 px-3"
        style={{ paddingTop: "10px", paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* Emoji picker popup */}
        {showPicker && (
          <div
            ref={pickerRef}
            className="absolute bottom-[68px] right-3 z-50 shadow-xl rounded-xl overflow-hidden"
          >
            <Picker
              data={data}
              onEmojiSelect={onEmojiSelect}
              theme="light"
              previewPosition="none"
              skinTonePosition="none"
              maxFrequentRows={2}
              perLine={8}
            />
          </div>
        )}

        {/*
         * Input pill wrapper.
         * overflow-visible is critical: TextareaComposer renders the suggestion
         * list as a sibling to the textarea inside containerClassName's div.
         * If this pill clips overflow the list gets hidden.
         */}
        <div className="flex-1 flex items-center bg-background-primary rounded-full px-4 min-h-10 border border-border-card focus-within:border-accent-green/40 transition-colors gap-2 py-1.5 overflow-visible">
          <TextareaComposer
            onKeyDown={onKeyDown}
            placeholder="Type a message…"
            minRows={1}
            maxRows={4}
            className="flex-1 bg-transparent resize-none outline-none font-body text-sm text-text-primary placeholder-text-secondary leading-[1.4] scrollbar-hide self-center"
            containerClassName="chat-input-composer-container"
          />

          {/* Emoji toggle */}
          <button
            ref={emojiButtonRef}
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className={`shrink-0 transition-colors touch-manipulation ${
              showPicker ? "text-accent-green-dark" : "text-text-secondary hover:text-accent-green"
            }`}
            aria-label="Add emoji"
          >
            <Smile className="size-4" />
          </button>
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={() => hasText && handleSubmit()}
          disabled={!hasText}
          className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 touch-manipulation ${
            hasText
              ? "bg-accent-green-dark text-white scale-100 opacity-100 shadow-md"
              : "bg-border-card text-text-secondary scale-90 opacity-50"
          }`}
          aria-label="Send message"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}
