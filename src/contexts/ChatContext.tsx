/**
 * ChatContext — manages the Stream Chat client lifecycle and channel IDs.
 *
 * Initialisation is split into two phases for a WhatsApp-like instant experience:
 *
 *  Phase 1 — "client ready" (~1-1.5s after login):
 *    1. POST /api/v1/chat/token  → get Stream user token
 *    2. streamClient.connectUser() → open the Stream WebSocket
 *    → `clientReady = true`: the Stream <Chat> provider mounts and channel list
 *       skeleton renders immediately, just like WhatsApp.
 *
 *  Phase 2 — "channels ready" (~0-1s later):
 *    3a. Check localStorage cache for known channel IDs (skips the network call
 *        on repeat visits — the common case).
 *    3b. If cache miss, POST /api/v1/chat/setup-channels → create/verify channels.
 *    4.  Watch all channels in parallel with Promise.all (vs. sequential awaits).
 *    → `isReady = true`: full realtime updates enabled, message input unlocked.
 *
 * Channel ID cache key: `chat_channels_{farmId}_{userId}` in localStorage.
 * Cache is invalidated only on logout or a setup-channels failure.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { StreamChat, Channel as StreamChannel } from "stream-chat";
import { Chat } from "stream-chat-react";

import { useAuth } from "./AuthContext";
import { API_BASE_URL, getApiHeaders } from "../api";
import { getStreamChatClient } from "../lib/stream";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ChatContextValue {
  client: StreamChat | null;
  allTeamChannel: StreamChannel | null;
  adminChannel: StreamChannel | null;
  dmChannel: StreamChannel | null;
  /** True once the Stream WebSocket is open — safe to render the Chat UI shell. */
  clientReady: boolean;
  /** True once all channels are watched and realtime updates are flowing. */
  isReady: boolean;
  error: string | null;
}

interface ChannelIdCache {
  all_team_channel_id: string;
  admin_channel_id: string | null;
  dm_channel_id: string;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

// ── Cache helpers ──────────────────────────────────────────────────────────────

function channelCacheKey(farmId: string, userId: string): string {
  return `chat_channels_${farmId}_${userId}`;
}

function readChannelCache(farmId: string, userId: string): ChannelIdCache | null {
  try {
    const raw = localStorage.getItem(channelCacheKey(farmId, userId));
    return raw ? (JSON.parse(raw) as ChannelIdCache) : null;
  } catch {
    return null;
  }
}

function writeChannelCache(farmId: string, userId: string, data: ChannelIdCache): void {
  try {
    localStorage.setItem(channelCacheKey(farmId, userId), JSON.stringify(data));
  } catch {
    // localStorage may be unavailable in private-browsing — fail silently.
  }
}

function clearChannelCache(farmId: string, userId: string): void {
  try {
    localStorage.removeItem(channelCacheKey(farmId, userId));
  } catch {
    // ignore
  }
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, role, farmId } = useAuth();

  const [client, setClient] = useState<StreamChat | null>(null);
  const [allTeamChannel, setAllTeamChannel] = useState<StreamChannel | null>(null);
  const [adminChannel, setAdminChannel] = useState<StreamChannel | null>(null);
  const [dmChannel, setDmChannel] = useState<StreamChannel | null>(null);
  const [clientReady, setClientReady] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !farmId) return;

    // Capture as a narrowed string so TypeScript knows it's non-null inside
    // the async init() closure, where the outer guard no longer applies.
    const resolvedFarmId: string = farmId;

    let cancelled = false;
    const streamClient = getStreamChatClient();

    async function init() {
      try {
        setError(null);

        // ── Phase 1: token + WebSocket connection ──────────────────────────────

        // 1. Get Stream user token from backend
        const tokenRes = await fetch(`${API_BASE_URL}/api/v1/chat/token`, {
          method: "POST",
          headers: {
            ...getApiHeaders(),
            "Content-Type": "application/json",
          } as HeadersInit,
          body: JSON.stringify({
            user_id: user!.id,
            user_name:
              user!.user_metadata?.full_name ||
              user!.email ||
              user!.id,
            role: role ?? "employee",
            farm_id: farmId,
          }),
        });

        if (!tokenRes.ok) throw new Error("Failed to get Stream token");
        const tokenJson = await tokenRes.json();
        const token: string = tokenJson.data?.token;
        if (!token) throw new Error("Stream token missing in response");

        if (cancelled) return;

        // 2. Connect the Stream WebSocket (no-op if already connected as this user)
        if (streamClient.userID !== user!.id) {
          await streamClient.connectUser(
            {
              id: user!.id,
              name:
                user!.user_metadata?.full_name ||
                user!.email ||
                user!.id,
            },
            token
          );
        }

        if (cancelled) return;

        // Phase 1 complete — expose the connected client so the Chat UI shell
        // can render immediately (channel list, input skeleton, etc.)
        setClient(streamClient);
        setClientReady(true);

        // ── Phase 2: resolve channel IDs + watch ──────────────────────────────

        // 3. Try the localStorage cache first to avoid a network round-trip on
        //    repeat visits (the common case after the very first login).
        let channelIds = readChannelCache(resolvedFarmId, user!.id);

        if (!channelIds) {
          // Cache miss — ask the backend to create/verify channels
          const setupRes = await fetch(`${API_BASE_URL}/api/v1/chat/setup-channels`, {
            method: "POST",
            headers: {
              ...getApiHeaders(),
              "Content-Type": "application/json",
            } as HeadersInit,
            body: JSON.stringify({
              user_id: user!.id,
              role: role ?? "employee",
              farm_id: farmId,
            }),
          });

          if (!setupRes.ok) throw new Error("Failed to set up chat channels");
          const setupJson = await setupRes.json();
          const { all_team_channel_id, admin_channel_id, dm_channel_id } =
            setupJson.data ?? {};

          channelIds = { all_team_channel_id, admin_channel_id, dm_channel_id };

          // Persist for future visits
          writeChannelCache(resolvedFarmId, user!.id, channelIds);
        }

        if (cancelled) return;

        const { all_team_channel_id, admin_channel_id, dm_channel_id } = channelIds;

        // 4. Watch all channels in parallel instead of sequentially
        const allTeamCh = streamClient.channel("messaging", all_team_channel_id);
        const dmCh = streamClient.channel("messaging", dm_channel_id);
        const adminCh =
          admin_channel_id
            ? streamClient.channel("messaging", admin_channel_id)
            : null;

        const watchPromises: Promise<unknown>[] = [
          allTeamCh.watch(),
          dmCh.watch(),
          ...(adminCh ? [adminCh.watch()] : []),
        ];

        await Promise.all(watchPromises);

        if (cancelled) return;

        setAllTeamChannel(allTeamCh);
        setAdminChannel(adminCh);
        setDmChannel(dmCh);
        setIsReady(true);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Chat initialisation failed";
          setError(msg);
          console.error("[ChatContext]", msg, err);

          // On failure, clear the channel cache so the next attempt re-fetches
          // from the backend rather than retrying a potentially stale cache.
          if (user) clearChannelCache(resolvedFarmId, user.id);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [user?.id, farmId, role]);

  // Disconnect Stream client when user logs out
  useEffect(() => {
    if (!user && client) {
      if (farmId && client.userID) clearChannelCache(farmId, client.userID);
      client.disconnectUser().catch(console.error);
      setClient(null);
      setAllTeamChannel(null);
      setAdminChannel(null);
      setDmChannel(null);
      setClientReady(false);
      setIsReady(false);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const value: ChatContextValue = {
    client,
    allTeamChannel,
    adminChannel,
    dmChannel,
    clientReady,
    isReady,
    error,
  };

  // Mount the Stream <Chat> provider as soon as the WebSocket is open (Phase 1),
  // not waiting for channels to be watched (Phase 2). This is what makes the
  // channel list render instantly.
  if (client && clientReady) {
    return (
      <ChatContext.Provider value={value}>
        <Chat client={client}>{children}</Chat>
      </ChatContext.Provider>
    );
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
