"use server";

import { z } from "zod";
import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { phoneToAuthEmail } from "@/lib/auth";
import { provisionAuthUser, authProvisioningAvailable } from "@/lib/provisionAuth";

async function adminContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const m = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, role: "ADMIN", status: "active" },
  });
  if (!m) throw new Error("Not authorized");
  return { userId: user.id, schoolId: m.schoolId };
}

async function activeAdminCount(schoolId: string) {
  return prisma.schoolMembership.count({ where: { schoolId, role: "ADMIN", status: "active" } });
}

const AddSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(6).max(20),
  role: z.enum(["ADMIN", "TEACHER"]),
  title: z.string().trim().max(40).optional(),
});

export async function addStaff(raw: z.infer<typeof AddSchema>): Promise<{ ok: boolean; pin?: string; existing?: boolean; error?: string }> {
  const input = AddSchema.parse(raw);
  const { userId, schoolId } = await adminContext();

  let targetUserId: string;
  let pin: string | undefined;

  const existingUser = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (existingUser) {
    targetUserId = existingUser.id;
  } else {
    if (!authProvisioningAvailable()) return { ok: false, error: "Staff logins aren't configured on the server" };
    pin = String(randomInt(10000, 99999));
    const authId = await provisionAuthUser(phoneToAuthEmail(input.phone), pin, { displayName: input.name, phone: input.phone });
    if (!authId) return { ok: false, error: "Could not create the login, try again" };
    await prisma.user.create({ data: { id: authId, phone: input.phone, displayName: input.name } });
    targetUserId = authId;
  }

  const existingM = await prisma.schoolMembership.findFirst({ where: { userId: targetUserId, schoolId } });
  if (existingM) {
    await prisma.schoolMembership.update({ where: { id: existingM.id }, data: { role: input.role, title: input.title ?? null, status: "active" } });
  } else {
    await prisma.schoolMembership.create({ data: { userId: targetUserId, schoolId, role: input.role, title: input.title ?? null } });
  }

  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "staff.added",
    entityType: "SchoolMembership",
    entityId: targetUserId,
    after: { name: input.name, role: input.role, title: input.title ?? null },
  });
  revalidatePath("/admin/staff");
  return { ok: true, pin, existing: !!existingUser };
}

const UpdateSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["ADMIN", "TEACHER"]),
  title: z.string().trim().max(40).optional(),
});

export async function updateStaff(raw: z.infer<typeof UpdateSchema>): Promise<{ ok: boolean; error?: string }> {
  const input = UpdateSchema.parse(raw);
  const { userId: me, schoolId } = await adminContext();

  const membership = await prisma.schoolMembership.findFirst({ where: { userId: input.userId, schoolId, status: "active" } });
  if (!membership) return { ok: false, error: "Staff member not found" };

  // Don't let the last admin be demoted (including demoting yourself).
  if (membership.role === "ADMIN" && input.role !== "ADMIN" && (await activeAdminCount(schoolId)) <= 1) {
    return { ok: false, error: "Keep at least one admin" };
  }

  await prisma.schoolMembership.update({ where: { id: membership.id }, data: { role: input.role, title: input.title ?? null } });
  await writeAudit({
    schoolId,
    actorUserId: me,
    action: "staff.updated",
    entityType: "SchoolMembership",
    entityId: input.userId,
    after: { role: input.role, title: input.title ?? null },
  });
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function removeStaff(targetUserId: string): Promise<{ ok: boolean; error?: string }> {
  const { userId: me, schoolId } = await adminContext();
  if (targetUserId === me) return { ok: false, error: "You can't remove yourself" };

  const membership = await prisma.schoolMembership.findFirst({ where: { userId: targetUserId, schoolId, status: "active" } });
  if (!membership) return { ok: false, error: "Staff member not found" };
  if (membership.role === "ADMIN" && (await activeAdminCount(schoolId)) <= 1) {
    return { ok: false, error: "Keep at least one admin" };
  }

  await prisma.schoolMembership.update({ where: { id: membership.id }, data: { status: "inactive" } });
  await writeAudit({ schoolId, actorUserId: me, action: "staff.removed", entityType: "SchoolMembership", entityId: targetUserId });
  revalidatePath("/admin/staff");
  return { ok: true };
}
