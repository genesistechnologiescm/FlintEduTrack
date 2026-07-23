"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { provisionAuthUserResult, authProvisioningAvailable } from "@/lib/provisionAuth";
import { canonicalCmPhone, normalizeCmPhone, phoneToAuthEmail } from "@/lib/auth";

// Owner-only: the Flint platform admin registers a school + its first FULL
// admin. This is the ONE screen that mints a school (there is no self-signup),
// so it is gated to isFlintAdmin and every registration is audited.
async function ownerContext(): Promise<{ userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { isFlintAdmin: true } });
  if (!me?.isFlintAdmin) throw new Error("Not authorized");
  return { userId: user.id };
}

const Schema = z.object({
  schoolName: z.string().trim().min(2).max(120),
  region: z.string().trim().min(2).max(60),
  town: z.string().trim().max(80).optional(),
  isCrisisZone: z.boolean().optional(),
  isTest: z.boolean().optional(),
  adminName: z.string().trim().min(2).max(80),
  adminPhone: z.string().trim().min(6).max(20),
  adminPin: z.string().regex(/^\d{5}$/),
});

export async function registerSchool(raw: z.infer<typeof Schema>): Promise<{ ok: boolean; error?: string }> {
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const input = parsed.data;
  const { userId } = await ownerContext();

  if (!/^237\d{9}$/.test(normalizeCmPhone(input.adminPhone))) return { ok: false, error: "phone" };
  const phone = canonicalCmPhone(input.adminPhone);

  // Preflight: creating the admin login needs the service-role key. If the
  // host is missing it (e.g. not set in Vercel), say so plainly instead of
  // creating a headless school and blaming the network.
  const existing = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
  if (!existing && !authProvisioningAvailable()) return { ok: false, error: "not_configured" };

  const school = await prisma.school.create({
    data: {
      name: input.schoolName,
      region: input.region,
      town: input.town || null,
      isCrisisZone: !!input.isCrisisZone,
      isTest: input.isTest ?? true,
    },
  });

  // Reuse the existing user with this phone, else provision a fresh auth login.
  let adminId: string;
  if (existing) {
    adminId = existing.id;
  } else {
    const r = await provisionAuthUserResult(phoneToAuthEmail(phone), input.adminPin, {
      displayName: input.adminName,
      phone,
      must_change_pin: true,
    });
    if (!r.ok) {
      await prisma.school.delete({ where: { id: school.id } }); // no headless school
      const error =
        r.status === 401 || r.status === 403 ? "bad_key" // service key missing/anon/invalid
        : r.status === 409 || r.status === 422 ? "phone" // email already exists
        : "provision";
      return { ok: false, error };
    }
    await prisma.user.create({ data: { id: r.id, phone, displayName: input.adminName, preferredLang: "EN" } });
    adminId = r.id;
  }

  await prisma.schoolMembership.create({
    data: { userId: adminId, schoolId: school.id, role: "ADMIN", adminScope: "FULL", title: "Principal" },
  });

  await writeAudit({
    schoolId: school.id,
    actorUserId: userId,
    action: "school.registered",
    entityType: "School",
    entityId: school.id,
    after: { name: input.schoolName, region: input.region, isTest: input.isTest ?? true, admin: phone },
  });

  revalidatePath("/flint");
  return { ok: true };
}
