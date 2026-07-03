// Notification Router v2 — capability-aware channel selection + the mock
// delivery adapters. THIS FILE IS THE ACTIVATION POINT: going live with paid
// channels means replacing the mock deliver functions with real providers
// (Africa's Talking SMS, WhatsApp Business API) — nothing else changes,
// exactly the Chariot pattern (mock/free now, swap the provider later).

export type PaidChannel = "SMS" | "WHATSAPP";

// Realistic per-message economics (FCFA): WhatsApp conversations are an order
// of magnitude cheaper than SMS — the router always picks the cheapest channel
// that can actually reach this parent.
export const CHANNEL_COST: Record<PaidChannel, number> = { SMS: 5, WHATSAPP: 1 };

// Channel policy, given what we know about the parent:
//  - WhatsApp-capable  → WhatsApp (cheap)
//  - smartphone + push → free push already covers them; SMS not needed (cost 0)
//  - everyone else     → SMS (the welfare-critical floor)
export function pickPaidChannel(
  capability: "SMARTPHONE" | "WHATSAPP" | "SMS_ONLY" | null,
  hasPushSubscription: boolean,
): PaidChannel | null {
  if (capability === "WHATSAPP") return "WHATSAPP";
  if (capability === "SMARTPHONE" && hasPushSubscription) return null; // free push suffices
  return "SMS";
}

// ── Mock adapters (demo). Swap bodies for real providers at activation. ──
export async function deliver(
  channel: PaidChannel,
  to: string,
  body: string,
): Promise<{ providerMsgId: string; costFcfa: number }> {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`[MOCK ${channel}] -> ${to}: ${body}`);
  }
  return {
    providerMsgId: `mock_${channel.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    costFcfa: CHANNEL_COST[channel],
  };
}
