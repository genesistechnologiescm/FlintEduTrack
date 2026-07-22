"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/adminScope";
import { isKnownPeriodStart, periodEndFor } from "@/lib/timetable";

const SlotSchema = z.object({
  classGroupId: z.string().uuid(),
  subjectId: z.string().uuid(),
  teacherUserId: z.string().uuid(),
  dayOfWeek: z.coerce.number().int().min(1).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  room: z.string().trim().max(30).optional(),
});

export type SlotResult = { ok: boolean; error?: string };

// Place one period on the grid. Two clashes are possible and both are checked
// here: the CLASS already has a lesson at this time (no DB constraint covers
// this), and the TEACHER is already teaching then — possibly for another class,
// which the unique index catches but only with an opaque error.
export async function setSlot(raw: z.infer<typeof SlotSchema>): Promise<SlotResult> {
  const input = SlotSchema.parse(raw);
  const { userId, schoolId } = await requireAdmin();
  if (!isKnownPeriodStart(input.startTime)) return { ok: false, error: "Not a valid period start time" };

  const [klass, subject, teacher, year] = await Promise.all([
    prisma.classGroup.findFirst({ where: { id: input.classGroupId, schoolId } }),
    prisma.subject.findFirst({ where: { id: input.subjectId, schoolId } }),
    prisma.schoolMembership.findFirst({
      where: { userId: input.teacherUserId, schoolId, status: "active" },
      include: { user: { select: { displayName: true } } },
    }),
    prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } }),
  ]);
  if (!klass || !subject) return { ok: false, error: "Class or subject is not in your school" };
  if (!teacher) return { ok: false, error: "That teacher is not on your staff list" };
  if (!year) return { ok: false, error: "Set up the academic year first, in School setup" };

  const term = await prisma.term.findFirst({ where: { academicYearId: year.id }, orderBy: { order: "asc" } });
  if (!term) return { ok: false, error: "Set up a term first, in School setup" };

  const clashForClass = await prisma.timetableSlot.findFirst({
    where: { termId: term.id, classGroupId: klass.id, dayOfWeek: input.dayOfWeek, startTime: input.startTime },
    include: { subject: true },
  });
  if (clashForClass) {
    return { ok: false, error: `${klass.name} already has ${clashForClass.subject.name} in this period` };
  }

  const clashForTeacher = await prisma.timetableSlot.findFirst({
    where: { termId: term.id, teacherUserId: input.teacherUserId, dayOfWeek: input.dayOfWeek, startTime: input.startTime },
    include: { classGroup: true },
  });
  if (clashForTeacher) {
    return { ok: false, error: `${teacher.user.displayName} is already teaching ${clashForTeacher.classGroup.name} then` };
  }

  const slot = await prisma.timetableSlot.create({
    data: {
      schoolId,
      termId: term.id,
      classGroupId: klass.id,
      subjectId: subject.id,
      teacherUserId: input.teacherUserId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: periodEndFor(input.startTime),
      room: input.room || null,
    },
  });
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "timetable.slot_added",
    entityType: "TimetableSlot",
    entityId: slot.id,
    after: { class: klass.name, subject: subject.name, day: input.dayOfWeek, start: input.startTime },
  });
  revalidatePath("/admin/timetable");
  revalidatePath("/attendance");
  return { ok: true };
}

// Remove a period. Refused once attendance has been marked against it, because
// deleting would orphan real registers — the school should replace it instead.
export async function removeSlot(slotId: string): Promise<SlotResult> {
  const { userId, schoolId } = await requireAdmin();
  const slot = await prisma.timetableSlot.findFirst({
    where: { id: slotId, schoolId },
    include: { subject: true, classGroup: true },
  });
  if (!slot) return { ok: false, error: "That period is not in your school" };

  const marked = await prisma.attendanceSession.count({ where: { timetableSlotId: slotId } });
  if (marked > 0) {
    return { ok: false, error: `Attendance has been marked for this period ${marked} time(s), so it cannot be deleted` };
  }

  await prisma.timetableSlot.delete({ where: { id: slotId } });
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "timetable.slot_removed",
    entityType: "TimetableSlot",
    entityId: slotId,
    before: { class: slot.classGroup.name, subject: slot.subject.name, day: slot.dayOfWeek, start: slot.startTime },
  });
  revalidatePath("/admin/timetable");
  revalidatePath("/attendance");
  return { ok: true };
}
