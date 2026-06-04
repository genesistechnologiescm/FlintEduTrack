// Polyfill a global WebSocket for the Node server runtime so @supabase/supabase-js
// (which eagerly inits a realtime client) works on Node < 22. Remove once the
// project is on Node 22 LTS (which ships a global WebSocket).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const g = globalThis as unknown as { WebSocket?: unknown };
    if (!g.WebSocket) {
      // @ts-expect-error - 'ws' ships no bundled types; used only as a Node polyfill
      const ws = await import("ws");
      g.WebSocket = ws.default;
    }
  }
}
