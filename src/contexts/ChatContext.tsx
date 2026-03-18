/**
 * ChatContext — manages the Stream Chat client lifecycle and channel IDs.
 *
 * On mount (after Supabase auth resolves) it:
 *  1. Calls POST /api/v1/chat/token  → gets a Stream user token
 *  2. Connects the Stream client with that token
 *  3. Calls POST /api/v1/chat/setup-channels → ensures farm channels exist
 *  4. Exposes the connected client + channel IDs to the rest of the app
 *
 * Wraps children with Stream's <Chat> provider so all Stream React SDK
 * components (Channel, MessageList, etc.) have access to the client.
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
  isReady: boolean;
  error: string | null;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

// ── Provider ───────────────────────────────────────────────────────────────────

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, role, farmId } = useAuth();

  const [client, setClient] = useState<StreamChat | null>(null);
  const [allTeamChannel, setAllTeamChannel] = useState<StreamChannel | null>(null);
  const [adminChannel, setAdminChannel] = useState<StreamChannel | null>(null);
  const [dmChannel, setDmChannel] = useState<StreamChannel | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !farmId) return;

    let cancelled = false;
    const streamClient = getStreamChatClient();

    async function init() {
      try {
        setError(null);

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

        // 2. Connect the Stream client
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

        // 3. Ensure farm channels exist on the backend
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
        const {
          all_team_channel_id,
          admin_channel_id,
          dm_channel_id,
        } = setupJson.data ?? {};

        if (cancelled) return;

        // 4. Watch channels so we get realtime updates
        const allTeamCh = streamClient.channel("messaging", all_team_channel_id);
        await allTeamCh.watch();

        const dmCh = streamClient.channel("messaging", dm_channel_id);
        await dmCh.watch();

        let adminCh: StreamChannel | null = null;
        if (admin_channel_id) {
          adminCh = streamClient.channel("messaging", admin_channel_id);
          await adminCh.watch();
        }

        if (cancelled) return;

        setClient(streamClient);
        setAllTeamChannel(allTeamCh);
        setAdminChannel(adminCh);
        setDmChannel(dmCh);
        setIsReady(true);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Chat initialisation failed";
          setError(msg);
          console.error("[ChatContext]", msg, err);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      // Disconnect when the user logs out (user becomes null on next render)
    };
  }, [user?.id, farmId, role]);

  // Disconnect Stream client when user logs out
  useEffect(() => {
    if (!user && client) {
      client.disconnectUser().catch(console.error);
      setClient(null);
      setAllTeamChannel(null);
      setAdminChannel(null);
      setDmChannel(null);
      setIsReady(false);
    }
  }, [user]);

  const value: ChatContextValue = {
    client,
    allTeamChannel,
    adminChannel,
    dmChannel,
    isReady,
    error,
  };

  // Wrap with Stream's Chat provider only when the client is ready
  if (client && isReady) {
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
