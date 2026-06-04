"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

const Schema = z.object({
  studentId: z.string().uuid(),
  type: z.enum(["NOTE", "MEETING_SCHEDULED", "HOME_VISIT", "OUTCOME_LOGGED", "STAFF_ASSIGNED"]),
  note: z.string().min(1).max(2000),
});
export type LogWelfareInput = z.infer<typeof Schema>;

// Records a HUMAN welfare action against a student's case (creating the case if
// none is open). The system never escalates on its own — every row here is a
// person's decision (Non-Negotiable: humans decide, always).
// Authorization: caller must be an active ADMIN of the school.
export async function logWelfareAction(raw: LogWelfareInput) {
  const input = Schema.parse(raw);

  const school = await prisma.school.findFirst();
  if (!school) throw new Error("No school");

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) throw new Error("Not authenticated");
  const adminMembership = await prisma.schoolMembership.findFirst({
    where: { userId: authUser.id, schoolId: school.id, role: "ADMIN", status: "active" },
  });
  if (!adminMembership) throw new Error("Not authorized");
  const actorUserId = authUser.id;

  let welfareCase = await prisma.welfareCase.findFirst({
    where: { schoolId: school.id, studentId: input.studentId, status: { not: "RESOLVED" } },
  });
  if (!welfareCase) {
    welfareCase = await prisma.welfareCase.create({
      data: {
        schoolId: school.id,
        studentId: input.studentId,
        status: "MONITORING",
        currentStage: 1,
        assignedStaffId: actorUserId,
      },
    });
  }

  await prisma.welfareEvent.create({
    data: {
      welfareCaseId: welfareCase.id,
      type: input.type,
      description: input.note,
      actorUserId,
    },
  });
  await prisma.welfareCase.update({
    where: { id: welfareCase.id },
    data: { lastActionAt: new Date() },
  });

  await writeAudit({
    schoolId: school.id,
    actorUserId: authUser.id,
    action: `welfare.${input.type.toLowerCase()}`,
    entityType: "WelfareCase",
    entityId: welfareCase.id,
    after: { studentId: input.studentId, type: input.type, note: input.note },
  });

  revalidatePath("/admin/welfare");
  return { ok: true as const };
}
