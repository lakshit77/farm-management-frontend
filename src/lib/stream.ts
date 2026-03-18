/**
 * Stream Chat client singleton.
 *
 * Uses StreamChat.getInstance so the same client is reused across hot-reloads
 * and React StrictMode double-invocations.
 */
import { StreamChat } from "stream-chat";

const apiKey = import.meta.env.VITE_STREAM_API_KEY as string;

if (!apiKey) {
  console.warn(
    "[stream] VITE_STREAM_API_KEY is not set. Chat features will not work."
  );
}

export function getStreamChatClient(): StreamChat {
  return StreamChat.getInstance(apiKey ?? "");
}
