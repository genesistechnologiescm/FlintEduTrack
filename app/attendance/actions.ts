"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { sendAbsenceAlerts } from "@/lib/notifications/sendAbsenceAlerts";
import { writeAudit } from "@/lib/audit";

export type SubmitResult = { ok: true; absent: number; total: number; late: boolean };

// Never trust raw input to a server action (Backend standard: validate with Zod).
const SubmitSchema = z.object({
  slotId: z.string().uuid(),
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  absentStudentIds: z.array(z.string().uuid()).max(2000),
});
export type SubmitInput = z.infer<typeof SubmitSchema>;

// Server-side attendance commit. Server-stamped time, idempotent per slot+date.
// Authorization: the caller must be active staff (teacher/admin) of the slot's school.
export async function submitAttendance(raw: SubmitInput): Promise<SubmitResult> {
  const input = SubmitSchema.parse(raw);

  const slot = await prisma.timetableSlot.findUnique({
    where: { id: input.slotId },
  });
  if (!slot) throw new Error("Timetable slot not found");

  // Authz — verify the authenticated user is staff for this school.
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) throw new Error("Not authenticated");
  const membership = await prisma.schoolMembership.findFirst({
    where: { userId: authUser.id, schoolId: slot.schoolId, status: "active" },
  });
  if (!membership) throw new Error("Not authorized for this school");

  const enrollments = await prisma.enrollment.findMany({
    where: { classGroupId: slot.classGroupId, status: "ACTIVE" },
    select: { studentId: true },
  });
  const studentIds = enrollments.map((e) => e.studentId);
  const absent = new Set(input.absentStudentIds);

  // Server-stamped time + late detection (never trust the client clock).
  const date = new Date(`${input.dateISO}T00:00:00.000Z`);
  const [h, m] = slot.startTime.split(":").map(Number);
  const periodStartAt = new Date(`${input.dateISO}T00:00:00.000Z`);
  periodStartAt.setUTCHours(h, m, 0, 0);
  const submittedAt = new Date();
  const isLate = submittedAt.getTime() > periodStartAt.getTime() + 30 * 60 * 1000;

  const idempotencyKey = `${slot.id}:${input.dateISO}`;

  const session = await prisma.attendanceSession.upsert({
    where: { idempotencyKey },
    update: { submittedAt, isLate },
    create: {
      schoolId: slot.schoolId,
      timetableSlotId: slot.id,
      classGroupId: slot.classGroupId,
      subjectId: slot.subjectId,
      teacherUserId: slot.teacherUserId,
      date,
      periodStartAt,
      submittedAt,
      isLate,
      idempotencyKey,
    },
  });

  await prisma.$transaction(
    studentIds.map((sid) =>
      prisma.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId: session.id, studentId: sid } },
        update: { status: absent.has(sid) ? "ABSENT" : "PRESENT" },
        create: {
          sessionId: session.id,
          studentId: sid,
          status: absent.has(sid) ? "ABSENT" : "PRESENT",
          setBy: "TEACHER",
          setByUserId: authUser.id,
        },
      }),
    ),
  );

  await writeAudit({
    schoolId: slot.schoolId,
    actorUserId: authUser.id,
    action: "attendance.submitted",
    entityType: "AttendanceSession",
    entityId: session.id,
    after: {
      date: input.dateISO,
      total: studentIds.length,
      absent: input.absentStudentIds.length,
      late: isLate,
    },
  });

  // Fire parent alerts (best-effort, server-side, through the mock router).
  // A notification failure must never fail the attendance commit.
  try {
    const school = await prisma.school.findUnique({ where: { id: slot.schoolId } });
    await sendAbsenceAlerts({
      schoolId: slot.schoolId,
      schoolName: school?.name ?? "School",
      dateISO: input.dateISO,
      absentStudentIds: input.absentStudentIds,
    });
  } catch {
    // logged elsewhere; attendance is already safely committed
  }

  return { ok: true, absent: input.absentStudentIds.length, total: studentIds.length, late: isLate };
}
