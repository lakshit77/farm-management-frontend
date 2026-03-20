/**
 * ChatView — desktop chat UI (md+ screens).
 *
 * Two-pane layout:
 *   ┌──────────────────────┬──────────────────────────────────────────┐
 *   │  Channel sidebar     │  Conversation panel                      │
 *   │  320px               │  Custom header + MessageList + Input     │
 *   │  - Channel list      │                                          │
 *   │  - Last msg preview  │                                          │
 *   │  - Unread badges     │                                          │
 *   └──────────────────────┴──────────────────────────────────────────┘
 *
 * On mobile this component is NOT rendered — MobileChatView is used instead.
 */

import React, { useState } from "react";
import {
  Channel,
  MessageList,
  MessageInput,
  Window,
} from "stream-chat-react";
import { Loader2, MessageCircle, MessageSquare } from "lucide-react";

import { useChat } from "../contexts/ChatContext";
import { useAuth } from "../contexts/AuthContext";
import { ChatMessageBubble } from "../components/chat/ChatMessageBubble";
import { ChatInput } from "../components/chat/ChatInput";
import { ChatHeader } from "../components/chat/ChatHeader";
import { ChatChannelListItem, type ChannelEntry, type ChannelKey } from "../components/chat/ChatChannelList";

// ── Empty / loading states ─────────────────────────────────────────────────────

function NoConversationPlaceholder() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-background-primary">
      <div className="w-20 h-20 rounded-full bg-accent-green/10 flex items-center justify-center">
        <MessageSquare className="size-9 text-accent-green-dark/40" />
      </div>
      <div className="text-center">
        <p className="font-heading text-base font-semibold text-text-primary">Select a chat</p>
        <p className="font-body text-sm text-text-secondary mt-1">
          Choose a channel from the sidebar to start messaging
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-background-primary">
      <Loader2 className="size-8 animate-spin text-accent-green" />
      <p className="font-body text-sm text-text-secondary">Connecting to chat…</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-center bg-background-primary">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-2">
        <MessageCircle className="size-7 text-red-400" />
      </div>
      <p className="font-body text-sm font-semibold text-text-primary">Chat unavailable</p>
      <p className="font-body text-xs text-text-secondary">{message}</p>
    </div>
  );
}

// ── Desktop sidebar ────────────────────────────────────────────────────────────

interface SidebarProps {
  channels: ChannelEntry[];
  activeKey: ChannelKey | null;
  onSelect: (key: ChannelKey) => void;
}

function DesktopSidebar({ channels, activeKey, onSelect }: SidebarProps) {
  return (
    <aside className="w-80 shrink-0 flex flex-col border-r border-border-card bg-white h-full">
      {/* Sidebar header — same height as ChatHeader (56px) */}
      <div className="flex items-center justify-between px-5 border-b border-border-card h-14 shrink-0">
        <h2 className="font-heading text-lg font-bold text-text-primary">Chats</h2>
        <div className="w-8 h-8 rounded-full bg-accent-green/10 flex items-center justify-center">
          <MessageCircle className="size-4 text-accent-green-dark" />
        </div>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto divide-y divide-border-card/50">
        {channels.map((entry) => (
          <ChatChannelListItem
            key={entry.key}
            entry={entry}
            isActive={activeKey === entry.key}
            onClick={() => onSelect(entry.key)}
          />
        ))}
      </div>

      {/* Footer — same height as the input bar (py-2.5 + h-10 buttons = ~60px) */}
      <div className="flex items-center justify-center px-5 border-t border-border-card h-[60px] shrink-0">
        <p className="font-body text-[11px] text-text-secondary text-center">
          Messages are end-to-end secured
        </p>
      </div>
    </aside>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ChatView(): React.ReactElement {
  const { isReady, error, allTeamChannel, adminChannel, dmChannel } = useChat();
  const { role } = useAuth();

  const [activeKey, setActiveKey] = useState<ChannelKey>("all-team");

  const channels: ChannelEntry[] = [
    { key: "all-team", label: "All Team", channel: allTeamChannel },
    ...(role === "admin"
      ? [{ key: "admin" as ChannelKey, label: "Admin", channel: adminChannel }]
      : []),
    { key: "dm", label: "Personal Assistant", channel: dmChannel },
  ];

  const activeEntry = channels.find((c) => c.key === activeKey) ?? channels[0];
  const activeChannel = activeEntry?.channel ?? null;

  // Height: fill viewport below the dashboard toolbar (~120px header + toolbar)
  const containerHeight = "calc(100vh - 130px)";

  if (!isReady && !error) {
    return (
      <div
        className="flex overflow-hidden rounded-xl border border-border-card shadow-card bg-background-primary"
        style={{ height: containerHeight }}
      >
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex overflow-hidden rounded-xl border border-border-card shadow-card bg-background-primary"
        style={{ height: containerHeight }}
      >
        <ErrorState message={error} />
      </div>
    );
  }

  return (
    <div
      className="flex overflow-hidden rounded-xl border border-border-card shadow-card"
      style={{ height: containerHeight }}
    >
      {/* Left sidebar */}
      <DesktopSidebar
        channels={channels}
        activeKey={activeKey}
        onSelect={setActiveKey}
      />

      {/* Right conversation panel */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background-primary min-w-0">
        {activeChannel ? (
          <Channel
            channel={activeChannel}
            Message={ChatMessageBubble}
            Input={ChatInput}
          >
            <Window>
              <ChatHeader channelKey={activeEntry.key} />
              <div className="flex-1 overflow-hidden chat-bg">
                <MessageList
                  disableDateSeparator={false}
                  messageActions={[]}
                />
              </div>
              <MessageInput Input={ChatInput} />
            </Window>
          </Channel>
        ) : (
          <NoConversationPlaceholder />
        )}
      </div>
    </div>
  );
}
