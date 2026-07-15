// Server-only: provision a Supabase Auth (GoTrue) user via the admin REST API,
// using the service-role key. Never import this into client code — the key must
// stay server-side. Mirrors the seed scripts' provisioning, but reads the id
// straight from the create response (no list scan).
import "server-only";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function authProvisioningAvailable(): boolean {
  return !!SUPABASE_URL && !!SERVICE_KEY;
}

// Result carries WHY provisioning failed so callers can show a precise message.
// status: 0 = not configured · -1 = network · else the GoTrue HTTP status
// (401/403 = the service key is missing/anon/invalid; 409/422 = email exists).
export type ProvisionResult = { ok: true; id: string } | { ok: false; status: number };

export async function provisionAuthUserResult(
  email: string,
  password: string,
  metadata: Record<string, unknown> = {},
): Promise<ProvisionResult> {
  if (!SUPABASE_URL || !SERVICE_KEY) return { ok: false, status: 0 };
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: metadata }),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const user = (await res.json()) as { id?: string };
    return user.id ? { ok: true, id: user.id } : { ok: false, status: res.status };
  } catch {
    return { ok: false, status: -1 };
  }
}

// Creates an email/password auth user (email pre-confirmed) and returns its id,
// or null on any failure. Thin wrapper over provisionAuthUserResult.
export async function provisionAuthUser(
  email: string,
  password: string,
  metadata: Record<string, unknown> = {},
): Promise<string | null> {
  const r = await provisionAuthUserResult(email, password, metadata);
  return r.ok ? r.id : null;
}
