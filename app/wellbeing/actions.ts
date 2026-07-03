"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { wellbeingWeekStartISO } from "@/lib/wellbeing";

async function staffContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const m = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, status: "active", role: { in: ["ADMIN", "TEACHER"] } },
  });
  if (!m) throw new Error("Not authorized");
  return { userId: user.id, schoolId: m.schoolId };
}

const SetSchema = z.object({
  studentId: z.string().uuid(),
  level: z.enum(["ENGAGED", "NEUTRAL", "NEEDS_ATTENTION"]),
});

// One tap per student per week; re-tapping revises this week's read.
export async function setWellbeing(raw: z.infer<typeof SetSchema>): Promise<{ ok: boolean; error?: string }> {
  const input = SetSchema.parse(raw);
  const { userId, schoolId } = await staffContext();

  const enrolled = await prisma.enrollment.findFirst({
    where: { studentId: input.studentId, schoolId, status: "ACTIVE" },
  });
  if (!enrolled) return { ok: false, error: "Student not in your school" };

  const weekStart = new Date(wellbeingWeekStartISO());
  await prisma.wellbeingSnapshot.upsert({
    where: { studentId_weekStart: { studentId: input.studentId, weekStart } },
    update: { level: input.level, setByUserId: userId },
    create: { schoolId, studentId: input.studentId, weekStart, level: input.level, setByUserId: userId },
  });
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "wellbeing.set",
    entityType: "WellbeingSnapshot",
    entityId: input.studentId,
    after: { level: input.level, weekStart: weekStart.toISOString().slice(0, 10) },
  });
  revalidatePath("/wellbeing");
  revalidatePath("/admin/welfare");
  return { ok: true };
}
