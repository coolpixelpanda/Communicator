/**
 * WebSocket (SignalR) hub URL for real-time chat.
 * Use the .NET backend with SignalR; Vercel serverless does not support WebSockets.
 */
export function getWsUrl(): string | null {
  const env = import.meta.env;
  const explicit = env.VITE_WS_URL as string | undefined;
  if (explicit && typeof explicit === "string" && explicit.trim()) return explicit.trim();

  const apiUrl = env.VITE_API_URL as string | undefined;
  if (apiUrl && typeof apiUrl === "string") {
    const base = apiUrl.trim().replace(/\/+$/, "");
    if (base.startsWith("http://")) return base.replace("http://", "ws://") + "/hub";
    if (base.startsWith("https://")) return base.replace("https://", "wss://") + "/hub";
  }

  return null;
}
