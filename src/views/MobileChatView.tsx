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

/** Shown only before the Stream WebSocket has connected (Phase 1 pending). */
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

/**
 * Skeleton rows displayed in the channel list while Phase 2
 * (channel watch) is still in progress after the WebSocket connects.
 */
function ChannelListSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto divide-y divide-border-card/50 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-4">
          <div className="w-11 h-11 rounded-full bg-border-card shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-border-card rounded w-2/3" />
            <div className="h-2.5 bg-border-card rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Channel list screen ────────────────────────────────────────────────────────

interface ChannelListScreenProps {
  channels: ChannelEntry[];
  onSelect: (entry: ChannelEntry) => void;
  /** When true, channels are still being fetched — show skeleton rows. */
  loading?: boolean;
}

function ChannelListScreen({ channels, onSelect, loading = false }: ChannelListScreenProps) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header — safe-area-top so it clears the notch */}
      <div className="flex items-center justify-between px-4 border-b border-border-card bg-white safe-area-top h-14 shrink-0">
        <h1 className="font-heading text-xl font-bold text-text-primary">Chats</h1>
        <div className="w-8 h-8 rounded-full bg-accent-green/10 flex items-center justify-center">
          <MessageCircle className="size-4 text-accent-green-dark" />
        </div>
      </div>

      {/* Channel list — skeleton while channels are being watched, real list once ready */}
      {loading ? (
        <ChannelListSkeleton />
      ) : (
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
      )}
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
              messageActions={[]}
            />
          </div>

          {/* Input bar */}
          <MessageInput Input={ChatInput} />
        </Window>
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
  const { clientReady, isReady, error, allTeamChannel, adminChannel, dmChannel } = useChat();
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

  // Phase 1 not yet complete — Stream WebSocket not connected yet
  if (!clientReady && !error) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  // Conversation overlay — only openable once channels are ready (Phase 2)
  if (activeEntry && activeEntry.channel) {
    return (
      <ConversationScreen
        entry={activeEntry}
        channel={activeEntry.channel}
        onBack={closeConversation}
      />
    );
  }

  // Channel list — fills the fixed overlay provided by MobileShell.
  // Shows skeleton rows while Phase 2 (channel watch) is still in progress.
  return (
    <div className="flex flex-col h-full">
      <ChannelListScreen
        channels={channels}
        onSelect={openConversation}
        loading={!isReady}
      />
    </div>
  );
}
