/**
 * MobileChatView — full-screen WhatsApp-style chat for mobile.
 *
 * Two states managed by local state:
 *   1. Channel list — shows all available channels with last message, unread count
 *   2. Conversation — full-viewport chat, covers everything (fixed inset-0)
 *
 * When a conversation is open, the MobileShell header and BottomTabBar are
 * visually covered by the fixed overlay, giving a true native-app feel.
 */

import { useState } from "react";
import {
  Channel,
  MessageList,
  MessageInput,
  Window,
  Thread,
} from "stream-chat-react";
import { Channel as StreamChannel } from "stream-chat";
import { Loader2, MessageCircle } from "lucide-react";

import { useChat } from "../contexts/ChatContext";
import { useAuth } from "../contexts/AuthContext";
import { ChatMessageBubble } from "../components/chat/ChatMessageBubble";
import { ChatInput } from "../components/chat/ChatInput";
import { ChatHeader } from "../components/chat/ChatHeader";
import { ChatChannelListItem, type ChannelEntry, type ChannelKey } from "../components/chat/ChatChannelList";

// ── Loading / error states ─────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-background-primary">
      <div className="w-14 h-14 rounded-full bg-accent-green/10 flex items-center justify-center">
        <Loader2 className="size-7 animate-spin text-accent-green-dark" />
      </div>
      <p className="font-body text-sm text-text-secondary">Connecting to chat…</p>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 bg-background-primary">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
        <MessageCircle className="size-7 text-red-400" />
      </div>
      <p className="font-body text-sm font-medium text-text-primary">Chat unavailable</p>
      <p className="font-body text-xs text-text-secondary text-center">{message}</p>
    </div>
  );
}

// ── Channel list screen ────────────────────────────────────────────────────────

interface ChannelListScreenProps {
  channels: ChannelEntry[];
  onSelect: (entry: ChannelEntry) => void;
}

function ChannelListScreen({ channels, onSelect }: ChannelListScreenProps) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header — safe-area-top so it clears the notch */}
      <div className="flex items-center justify-between px-4 border-b border-border-card bg-white safe-area-top h-14 shrink-0">
        <h1 className="font-heading text-xl font-bold text-text-primary">Chats</h1>
        <div className="w-8 h-8 rounded-full bg-accent-green/10 flex items-center justify-center">
          <MessageCircle className="size-4 text-accent-green-dark" />
        </div>
      </div>

      {/* Channel list — pad bottom so last item clears the tab bar */}
      <div
        className="flex-1 overflow-y-auto divide-y divide-border-card/50"
        style={{ paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {channels.map((entry) => (
          <ChatChannelListItem
            key={entry.key}
            entry={entry}
            isActive={false}
            onClick={() => onSelect(entry)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Conversation screen ────────────────────────────────────────────────────────

interface ConversationScreenProps {
  entry: ChannelEntry;
  channel: StreamChannel;
  onBack: () => void;
}

function ConversationScreen({ entry, channel, onBack }: ConversationScreenProps) {
  return (
    // Fixed overlay covers the entire viewport — no header, no tab bar
    <div className="fixed inset-0 z-[200] flex flex-col bg-background-primary chat-conversation-enter">
      <Channel
        channel={channel}
        Message={ChatMessageBubble}
        Input={ChatInput}
      >
        <Window>
          {/* Custom header with back button */}
          <ChatHeader onBack={onBack} channelKey={entry.key} />

          {/* Message list — fills remaining space */}
          <div className="flex-1 overflow-hidden chat-bg">
            <MessageList
              disableDateSeparator={false}
              messageActions={["delete", "flag", "react"]}
            />
          </div>

          {/* Input bar */}
          <MessageInput Input={ChatInput} />
        </Window>
        <Thread />
      </Channel>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface MobileChatViewProps {
  onExitChat?: () => void;
  /** Called with true when a conversation opens, false when it closes. */
  onConversationChange?: (open: boolean) => void;
}

export function MobileChatView({ onExitChat: _onExitChat, onConversationChange }: MobileChatViewProps) {
  const { isReady, error, allTeamChannel, adminChannel, dmChannel } = useChat();
  const { role } = useAuth();

  const [activeEntry, setActiveEntry] = useState<ChannelEntry | null>(null);

  const openConversation = (entry: ChannelEntry) => {
    setActiveEntry(entry);
    onConversationChange?.(true);
  };

  const closeConversation = () => {
    setActiveEntry(null);
    onConversationChange?.(false);
  };

  const channels: ChannelEntry[] = [
    { key: "all-team", label: "All Team", channel: allTeamChannel },
    ...(role === "admin"
      ? [{ key: "admin" as ChannelKey, label: "Admin", channel: adminChannel }]
      : []),
    { key: "dm", label: "Personal Assistant", channel: dmChannel },
  ];

  if (!isReady && !error) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  // Conversation overlay
  if (activeEntry && activeEntry.channel) {
    return (
      <ConversationScreen
        entry={activeEntry}
        channel={activeEntry.channel}
        onBack={closeConversation}
      />
    );
  }

  // Channel list — fills the fixed overlay provided by MobileShell
  return (
    <div className="flex flex-col h-full">
      <ChannelListScreen
        channels={channels}
        onSelect={openConversation}
      />
    </div>
  );
}
