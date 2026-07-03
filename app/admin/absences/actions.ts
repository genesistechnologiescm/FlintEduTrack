"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/adminScope";

// Scoped authorization — see lib/adminScope.ts.
async function adminContext() {
  return requireAdmin("WELFARE");
}

const ExcuseSchema = z.object({
  recordId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
});

// Phase-1 spec: "admin reclassifies absences with documentation". The record
// flips to EXCUSED (so every rate, risk score and report treats the child
// fairly) and an AbsenceAuthorisation row keeps the documented reason.
export async function excuseAbsence(raw: z.infer<typeof ExcuseSchema>): Promise<{ ok: boolean; error?: string }> {
  const input = ExcuseSchema.parse(raw);
  const { userId, schoolId } = await adminContext();

  const record = await prisma.attendanceRecord.findFirst({
    where: { id: input.recordId, status: "ABSENT", session: { schoolId } },
    include: { session: { select: { date: true } } },
  });
  if (!record) return { ok: false, error: "Absence not found or already excused" };

  await prisma.$transaction([
    prisma.attendanceRecord.update({
      where: { id: record.id },
      data: { status: "EXCUSED", setBy: "ADMIN", setByUserId: userId, note: input.reason },
    }),
    prisma.absenceAuthorisation.create({
      data: {
        studentId: record.studentId,
        schoolId,
        fromDate: record.session.date,
        toDate: record.session.date,
        reason: input.reason,
        isExcusePostHoc: true,
        authorisedBy: userId,
      },
    }),
  ]);

  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "absence.excused",
    entityType: "AttendanceRecord",
    entityId: record.id,
    before: { status: "ABSENT" },
    after: { status: "EXCUSED", reason: input.reason, studentId: record.studentId },
  });

  revalidatePath("/admin/absences");
  revalidatePath("/admin");
  revalidatePath("/admin/welfare");
  revalidatePath("/admin/risk");
  revalidatePath("/parent");
  return { ok: true };
}
