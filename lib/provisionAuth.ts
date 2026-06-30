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

// Creates an email/password auth user (email pre-confirmed) and returns its id.
// Returns null if provisioning isn't configured or the call fails.
export async function provisionAuthUser(
  email: string,
  password: string,
  metadata: Record<string, unknown> = {},
): Promise<string | null> {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
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
    if (!res.ok) return null;
    const user = (await res.json()) as { id?: string };
    return user.id ?? null;
  } catch {
    return null;
  }
}
