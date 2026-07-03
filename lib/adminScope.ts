// Scoped admin authorization (P2: "Multi-admin roles, each scoped").
// ONE helper, used by every admin server action and page:
//   requireAdmin()            → FULL admins only (staff, setup, governance)
//   requireAdmin("FINANCE")   → FULL or FINANCE (fees, payments, reminders)
//   requireAdmin("WELFARE")   → FULL or WELFARE (welfare, excuses, wellbeing)
// Enforcement is server-side — hiding buttons is UX, this is the boundary.
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type ScopeNeed = "FINANCE" | "WELFARE";

export async function requireAdmin(need?: ScopeNeed): Promise<{ userId: string; schoolId: string; scope: "FULL" | ScopeNeed }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const m = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, role: "ADMIN", status: "active" },
  });
  if (!m) throw new Error("Not authorized");
  const scope = m.adminScope;
  if (scope !== "FULL" && scope !== need) {
    throw new Error("Outside your admin scope");
  }
  return { userId: user.id, schoolId: m.schoolId, scope: scope as "FULL" | ScopeNeed };
}

// Page-side variant: returns null instead of throwing, so pages can redirect.
export async function adminWithScope(need?: ScopeNeed): Promise<{ userId: string; schoolId: string } | null> {
  try {
    const ctx = await requireAdmin(need);
    return { userId: ctx.userId, schoolId: ctx.schoolId };
  } catch {
    return null;
  }
}
