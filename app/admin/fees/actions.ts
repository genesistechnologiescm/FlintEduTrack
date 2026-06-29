"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { ensureCurrentYear } from "@/app/admin/setup/actions";

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

const FeeSchema = z.object({
  label: z.string().trim().min(1).max(80),
  amount: z.coerce.number().int().min(1).max(100_000_000),
  classGroupId: z.string().uuid().optional(),
});

export async function addFeeItem(raw: z.infer<typeof FeeSchema>): Promise<{ ok: boolean; error?: string }> {
  const input = FeeSchema.parse(raw);
  const { userId, schoolId } = await adminContext();
  const year = await ensureCurrentYear(schoolId);
  const term = await prisma.term.findFirst({ where: { academicYearId: year.id }, orderBy: { order: "asc" } });
  if (!term) return { ok: false, error: "No academic term set up" };

  if (input.classGroupId) {
    const klass = await prisma.classGroup.findFirst({ where: { id: input.classGroupId, schoolId } });
    if (!klass) return { ok: false, error: "Class not in your school" };
  }

  const fee = await prisma.feeItem.create({
    data: {
      schoolId,
      termId: term.id,
      classGroupId: input.classGroupId ?? null,
      label: input.label,
      amount: input.amount,
      createdBy: userId,
    },
  });
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "fee.created",
    entityType: "FeeItem",
    entityId: fee.id,
    after: { label: input.label, amount: input.amount, classGroupId: input.classGroupId ?? null },
  });
  revalidatePath("/admin/fees");
  revalidatePath("/parent/fees");
  return { ok: true };
}

export async function deleteFeeItem(id: string): Promise<{ ok: boolean }> {
  const { userId, schoolId } = await adminContext();
  const fee = await prisma.feeItem.findFirst({ where: { id, schoolId, deletedAt: null } });
  if (!fee) return { ok: false };
  await prisma.feeItem.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ schoolId, actorUserId: userId, action: "fee.deleted", entityType: "FeeItem", entityId: id });
  revalidatePath("/admin/fees");
  revalidatePath("/parent/fees");
  return { ok: true };
}
