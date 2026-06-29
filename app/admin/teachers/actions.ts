"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

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

const AddSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(6).max(20),
});

export async function addTeacher(raw: z.infer<typeof AddSchema>): Promise<{ ok: boolean }> {
  const input = AddSchema.parse(raw);
  const { userId, schoolId } = await adminContext();

  let teacher = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (!teacher) {
    teacher = await prisma.user.create({
      data: { id: randomUUID(), phone: input.phone, displayName: input.name },
    });
  }
  await prisma.schoolMembership.upsert({
    where: { userId_schoolId_role: { userId: teacher.id, schoolId, role: "TEACHER" } },
    update: { status: "active" },
    create: { userId: teacher.id, schoolId, role: "TEACHER" },
  });
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "teacher.added",
    entityType: "User",
    entityId: teacher.id,
    after: { name: input.name, phone: input.phone },
  });
  revalidatePath("/admin/teachers");
  return { ok: true };
}

const AssignSchema = z.object({
  teacherUserId: z.string().uuid(),
  classGroupId: z.string().uuid(),
  subjectId: z.string().uuid(),
  dayOfWeek: z.coerce.number().int().min(1).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
});

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export async function assignTeacher(raw: z.infer<typeof AssignSchema>): Promise<{ ok: boolean; error?: string }> {
  const input = AssignSchema.parse(raw);
  const { userId, schoolId } = await adminContext();

  const [klass, subject, year] = await Promise.all([
    prisma.classGroup.findFirst({ where: { id: input.classGroupId, schoolId } }),
    prisma.subject.findFirst({ where: { id: input.subjectId, schoolId } }),
    prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } }),
  ]);
  if (!klass || !subject) return { ok: false, error: "Class or subject not in your school" };
  const term = year ? await prisma.term.findFirst({ where: { academicYearId: year.id }, orderBy: { order: "asc" } }) : null;
  if (!term) return { ok: false, error: "No academic term set up" };

  try {
    const slot = await prisma.timetableSlot.create({
      data: {
        schoolId,
        termId: term.id,
        classGroupId: klass.id,
        subjectId: subject.id,
        teacherUserId: input.teacherUserId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: addMinutes(input.startTime, 55),
      },
    });
    await writeAudit({
      schoolId,
      actorUserId: userId,
      action: "timetable.assigned",
      entityType: "TimetableSlot",
      entityId: slot.id,
      after: { subject: subject.name, class: klass.name, day: input.dayOfWeek, start: input.startTime },
    });
  } catch {
    return { ok: false, error: "That teacher already has a class at this time" };
  }
  revalidatePath("/admin/teachers");
  return { ok: true };
}
