"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/adminScope";

// Scoped authorization — see lib/adminScope.ts.
async function adminContext() {
  return requireAdmin();
}

const IdSchema = z.string().uuid();

// Approve: apply the new score to the grade and close the request — atomically,
// so a request can never be marked approved without the grade actually changing.
export async function approveCorrection(rawId: string): Promise<{ ok: boolean; error?: string }> {
  const id = IdSchema.parse(rawId);
  const { userId, schoolId } = await adminContext();

  const request = await prisma.gradeCorrection.findFirst({
    where: { id, schoolId, status: "PENDING" },
    include: { grade: { include: { subject: { select: { name: true } } } } },
  });
  if (!request) return { ok: false, error: "Request not found or already decided" };

  await prisma.$transaction([
    prisma.grade.update({
      where: { id: request.gradeId },
      data: { score: request.newScore, enteredBy: request.requestedBy },
    }),
    prisma.gradeCorrection.update({
      where: { id: request.id },
      data: { status: "APPROVED", decidedBy: userId, decidedAt: new Date() },
    }),
  ]);

  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "grade.correction_approved",
    entityType: "Grade",
    entityId: request.gradeId,
    before: { score: Number(request.oldScore) },
    after: { score: Number(request.newScore), subject: request.grade.subject.name, requestedBy: request.requestedBy },
  });
  revalidatePath("/admin/corrections");
  revalidatePath("/report", "layout");
  return { ok: true };
}

export async function rejectCorrection(rawId: string): Promise<{ ok: boolean; error?: string }> {
  const id = IdSchema.parse(rawId);
  const { userId, schoolId } = await adminContext();

  const request = await prisma.gradeCorrection.findFirst({ where: { id, schoolId, status: "PENDING" } });
  if (!request) return { ok: false, error: "Request not found or already decided" };

  await prisma.gradeCorrection.update({
    where: { id: request.id },
    data: { status: "REJECTED", decidedBy: userId, decidedAt: new Date() },
  });
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "grade.correction_rejected",
    entityType: "Grade",
    entityId: request.gradeId,
    before: { score: Number(request.oldScore) },
    after: { rejectedNewScore: Number(request.newScore) },
  });
  revalidatePath("/admin/corrections");
  return { ok: true };
}
