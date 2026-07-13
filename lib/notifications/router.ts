// Notification Router v2 — capability-aware channel selection + the mock
// delivery adapters. THIS FILE IS THE ACTIVATION POINT: going live with paid
// channels means replacing the mock deliver functions with real providers
// (Africa's Talking SMS/Voice, WhatsApp Business API) — nothing else changes,
// exactly the Chariot pattern (mock/free now, swap the provider later).

type PaidChannel = "SMS" | "WHATSAPP" | "VOICE";

// Realistic per-message economics (FCFA): WhatsApp conversations are an order
// of magnitude cheaper than SMS; a text-to-speech voice call costs the most,
// but it is the only channel that reaches a parent who cannot read. The router
// always picks the cheapest channel that can actually reach this parent.
const CHANNEL_COST: Record<PaidChannel, number> = { SMS: 5, WHATSAPP: 1, VOICE: 25 };

// Channel policy, given what we know about the parent:
//  - WhatsApp-capable  → WhatsApp (cheap)
//  - smartphone + push → free push already covers them; SMS not needed (cost 0)
//  - voice-only        → text-to-speech call in the parent's preferred language
//                        (declared at enrolment: this parent cannot read SMS)
//  - everyone else     → SMS (the welfare-critical floor)
export function pickPaidChannel(
  capability: "SMARTPHONE" | "WHATSAPP" | "SMS_ONLY" | "VOICE_ONLY" | null,
  hasPushSubscription: boolean,
): PaidChannel | null {
  if (capability === "WHATSAPP") return "WHATSAPP";
  if (capability === "VOICE_ONLY") return "VOICE";
  if (capability === "SMARTPHONE" && hasPushSubscription) return null; // free push suffices
  return "SMS";
}

// ── Mock adapters (demo). Swap bodies for real providers at activation. ──
// For VOICE the body is the text-to-speech script — it is already written in
// the parent's preferred language by the caller (absenceMessage handles EN/FR),
// so activation is: hand the same string to the provider's TTS voice call.
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
