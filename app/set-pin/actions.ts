"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { checkPin, type PinReason } from "@/lib/pin";
import { setAuthPassword } from "@/lib/provisionAuth";
import { writeAudit } from "@/lib/audit";

const Schema = z.object({
  pin: z.string().regex(/^\d{5}$/),
  confirm: z.string(),
});

// Where a person lands once their PIN is their own. Mirrors the login router
// but only for the roles that are ever provisioned with a temporary PIN.
async function homeFor(userId: string): Promise<string> {
  const [me, membership] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { isGovernment: true, isFlintAdmin: true } }),
    prisma.schoolMembership.findFirst({ where: { userId, status: "active" }, orderBy: { role: "asc" } }),
  ]);
  if (me?.isGovernment) return "/government";
  if (membership?.role === "ADMIN") return "/admin";
  if (membership?.role === "TEACHER") return "/attendance";
  if (me?.isFlintAdmin) return "/flint";
  const student = await prisma.studentAccount.findUnique({ where: { id: userId }, select: { id: true } });
  return student ? "/student" : "/parent";
}

// Sets the signed-in user's own PIN and clears the must-change flag. The
// temporary PIN handed over by an admin never becomes the permanent secret.
export async function changePin(
  input: { pin: string; confirm: string },
): Promise<{ ok: false; code: PinReason | "mismatch" | "auth" } | void> {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "length" };
  if (parsed.data.pin !== parsed.data.confirm) return { ok: false, code: "mismatch" };

  const reason = checkPin(parsed.data.pin);
  if (reason) return { ok: false, code: reason };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "auth" };

  // Admin API (not supabase.auth.updateUser) so the 5-digit PIN isn't rejected
  // by GoTrue's min-length policy. Scoped to the caller's own id only.
  const ok = await setAuthPassword(user.id, parsed.data.pin, false);
  if (!ok) return { ok: false, code: "auth" };

  // Record WHEN, never the PIN itself.
  await prisma.user.update({ where: { id: user.id }, data: { authProvisionedAt: new Date() } }).catch(() => {});
  await writeAudit({ actorUserId: user.id, action: "auth.pin_changed", entityType: "User", entityId: user.id });

  redirect(await homeFor(user.id));
}
