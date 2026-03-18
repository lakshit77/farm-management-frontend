/**
 * ChatInput — custom message input bar for Stream Chat v13.
 *
 * Uses emoji-mart for the emoji picker and stream-chat-react's
 * useMessageComposer / useStateStore for text state management.
 */

import React, { useRef, useState, useEffect } from "react";
import {
  useMessageInputContext,
  useMessageComposer,
  useStateStore,
} from "stream-chat-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { Send, Smile } from "lucide-react";

function textSelector(state: { text?: string }) {
  return { text: state.text ?? "" };
}

interface EmojiData {
  native: string;
}

export function ChatInput() {
  const { handleSubmit, textareaRef } = useMessageInputContext("ChatInput");
  const messageComposer = useMessageComposer();
  const { text } = useStateStore(messageComposer.textComposer.state, textSelector);

  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  const hasText = text.trim().length > 0;

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
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

  function onEmojiSelect(emoji: EmojiData) {
    const ta = (textareaRef as React.RefObject<HTMLTextAreaElement>).current;
    const cursorPos = ta?.selectionStart ?? text.length;
    const newText = text.slice(0, cursorPos) + emoji.native + text.slice(cursorPos);
    const newCursor = cursorPos + emoji.native.length;
    messageComposer.textComposer.handleChange({
      text: newText,
      selection: { start: newCursor, end: newCursor },
    });
    // Keep focus on textarea after picking
    setTimeout(() => {
      if (ta) {
        ta.focus();
        ta.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  }

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const el = e.target;
    messageComposer.textComposer.handleChange({
      text: el.value,
      selection: { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 },
    });
    // Auto-resize
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (hasText) handleSubmit();
    }
  }

  return (
    <div className="relative flex items-center gap-2 px-3 bg-white border-t border-border-card" style={{ paddingTop: "10px", paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))" }}>
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

      {/* Input pill */}
      <div className="flex-1 flex items-center bg-background-primary rounded-full px-4 h-10 border border-border-card focus-within:border-accent-green/40 transition-colors gap-2">
        <textarea
          ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
          value={text}
          onChange={onChange}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Type a message..."
          className="flex-1 bg-transparent resize-none outline-none font-body text-sm text-text-primary placeholder-text-secondary leading-[1.4] max-h-[80px] overflow-y-auto scrollbar-hide self-center"
          style={{ height: "20px" }}
        />

        {/* Emoji button */}
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
  );
}
