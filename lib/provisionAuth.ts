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

// Looks up an existing auth user's id by email (used when provisioning says
// "email exists": the login was minted before, we re-align to it).
export async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=2000`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: { id: string; email?: string }[] };
    return data.users?.find((u) => u.email === email)?.id ?? null;
  } catch {
    return null;
  }
}

// Sets an auth user's password via the admin API — which, unlike the
// user-facing supabase.auth.updateUser(), BYPASSES GoTrue's min-length policy
// (our PINs are 5 digits; the default minimum is 6). `mustChangePin` marks
// whether the new PIN is a temporary one an admin handed over (true, the
// default for a reset) or the user's own private PIN (false).
export async function setAuthPassword(id: string, password: string, mustChangePin = true): Promise<boolean> {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
      method: "PUT",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password, user_metadata: { must_change_pin: mustChangePin } }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
