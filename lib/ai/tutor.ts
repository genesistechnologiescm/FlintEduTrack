// Chariot — the EduTrack student study tutor.
// Server-only. The model provider sits behind this adapter: free Gemini Flash now,
// swap to Claude after we win (one new branch here, no caller changes) — same
// free→paid discipline as the Notification Router.
import "server-only";

export type ChatTurn = { role: "user" | "assistant"; text: string };
export type ChariotResult =
  | { ok: true; text: string }
  | { ok: false; reason: "not_configured" | "unavailable" };

// Locked tutoring persona + child-safety guardrails. (For CHILDREN — keep this strict.)
const SYSTEM = `You are Chariot, a warm, encouraging study tutor for secondary-school students in Cameroon, inside the EduTrack app.
Your job: help the student truly understand their schoolwork.
Rules you must always follow:
1. Be patient, kind and age-appropriate. Never be harsh.
2. Reply in the student's language — English or French — matching the language they wrote in.
3. TEACH, don't just answer. Explain step by step and guide the student to the answer. For homework or quiz questions, walk through the method or ask a leading question rather than simply giving the final answer, so the student learns.
4. Stay strictly on educational topics: their subjects, study skills, exam/GCE preparation. If asked anything off-topic, unsafe, harmful, or personal, gently and briefly steer back to studying.
5. Never ask for or store personal information (full name, address, phone, passwords, location).
6. Keep answers concise and clear; use simple examples relevant to a Cameroonian student.
7. If you are unsure, say so honestly and suggest how to find out.`;

// gemini-2.5-flash: current free-tier Flash model. (2.0-flash has a 0-quota free
// tier on some projects/regions — confirmed against the live key — so don't use it.)
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export function tutorConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export async function askChariot(history: ChatTurn[]): Promise<ChariotResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, reason: "not_configured" };

  // Map our turns to Gemini's content format (user ↔ "user", assistant ↔ "model").
  const contents = history.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.text }] }));

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM }] },
          contents,
          generationConfig: { temperature: 0.6, maxOutputTokens: 700 },
        }),
      },
    );
    if (!res.ok) return { ok: false, reason: "unavailable" };
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    if (!text) return { ok: false, reason: "unavailable" }; // empty (e.g. safety block)
    return { ok: true, text };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
