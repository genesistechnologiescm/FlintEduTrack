"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

// Grade entry is open to any active staff member (teacher or admin) of the
// school — mirrors the pragmatic, demo-smooth authz of the attendance screen.
// Per-teacher subject restriction is a Phase-2 hardening.
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

const RosterSchema = z.object({
  classGroupId: z.string().uuid(),
  subjectId: z.string().uuid(),
  termId: z.string().uuid(),
  sequence: z.coerce.number().int().min(1).max(2),
});

export type RosterRow = { studentId: string; name: string; score: number | null };

export async function loadRoster(raw: z.infer<typeof RosterSchema>): Promise<RosterRow[]> {
  const input = RosterSchema.parse(raw);
  const { schoolId } = await staffContext();

  // All three must belong to the caller's school.
  const [klass, subject, term] = await Promise.all([
    prisma.classGroup.findFirst({ where: { id: input.classGroupId, schoolId } }),
    prisma.subject.findFirst({ where: { id: input.subjectId, schoolId } }),
    prisma.term.findFirst({ where: { id: input.termId, academicYear: { schoolId } } }),
  ]);
  if (!klass || !subject || !term) throw new Error("Class, subject or term not in your school");

  const enrollments = await prisma.enrollment.findMany({
    where: { classGroupId: input.classGroupId, schoolId, status: "ACTIVE" },
    include: { student: true },
    orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
  });
  const studentIds = enrollments.map((e) => e.studentId);
  const grades = await prisma.grade.findMany({
    where: { studentId: { in: studentIds }, subjectId: input.subjectId, termId: input.termId, sequence: input.sequence },
  });
  const scoreByStudent = new Map(grades.map((g) => [g.studentId, Number(g.score)]));

  return enrollments.map((e) => ({
    studentId: e.studentId,
    name: `${e.student.lastName} ${e.student.firstName}`.trim(),
    score: scoreByStudent.get(e.studentId) ?? null,
  }));
}

const SaveSchema = z.object({
  classGroupId: z.string().uuid(),
  subjectId: z.string().uuid(),
  termId: z.string().uuid(),
  sequence: z.coerce.number().int().min(1).max(2),
  scores: z
    .array(z.object({ studentId: z.string().uuid(), score: z.number().min(0).max(20) }))
    .max(2000),
});

export async function saveGrades(raw: z.infer<typeof SaveSchema>): Promise<{ ok: boolean; saved: number; pending: number; error?: string }> {
  const input = SaveSchema.parse(raw);
  const { userId, schoolId } = await staffContext();

  const [klass, subject, term] = await Promise.all([
    prisma.classGroup.findFirst({ where: { id: input.classGroupId, schoolId } }),
    prisma.subject.findFirst({ where: { id: input.subjectId, schoolId } }),
    prisma.term.findFirst({ where: { id: input.termId, academicYear: { schoolId } } }),
  ]);
  if (!klass || !subject || !term) return { ok: false, saved: 0, pending: 0, error: "Class, subject or term not in your school" };
  if (input.sequence > term.sequenceCount) return { ok: false, saved: 0, pending: 0, error: "That sequence is not part of this term" };

  // Only students actually enrolled in the class may be graded here.
  const enrolled = new Set(
    (await prisma.enrollment.findMany({ where: { classGroupId: input.classGroupId, schoolId, status: "ACTIVE" }, select: { studentId: true } })).map((e) => e.studentId),
  );

  // Tamper-evident grading: first entry writes directly; CHANGING a recorded
  // grade never writes — it files a correction request an admin must approve.
  let saved = 0;
  let pending = 0;
  for (const row of input.scores) {
    if (!enrolled.has(row.studentId)) continue;

    const existing = await prisma.grade.findUnique({
      where: {
        studentId_subjectId_termId_sequence: {
          studentId: row.studentId,
          subjectId: input.subjectId,
          termId: input.termId,
          sequence: input.sequence,
        },
      },
    });

    if (!existing) {
      await prisma.grade.create({
        data: {
          studentId: row.studentId,
          subjectId: input.subjectId,
          schoolId,
          termId: input.termId,
          sequence: input.sequence,
          score: row.score,
          enteredBy: userId,
        },
      });
      saved++;
      continue;
    }

    if (Number(existing.score) === row.score) continue; // unchanged

    // One live request per grade: refresh it if the teacher re-edits.
    const open = await prisma.gradeCorrection.findFirst({ where: { gradeId: existing.id, status: "PENDING" } });
    if (open) {
      await prisma.gradeCorrection.update({ where: { id: open.id }, data: { newScore: row.score, requestedBy: userId } });
    } else {
      await prisma.gradeCorrection.create({
        data: { schoolId, gradeId: existing.id, oldScore: existing.score, newScore: row.score, requestedBy: userId },
      });
    }
    pending++;
  }

  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "grades.entered",
    entityType: "ClassGroup",
    entityId: input.classGroupId,
    after: { subject: subject.name, class: klass.name, term: term.label, sequence: input.sequence, saved, correctionsRequested: pending },
  });
  // Report cards are server-rendered per student; nudge their cache.
  revalidatePath("/report", "layout");
  revalidatePath("/admin/corrections");
  return { ok: true, saved, pending };
}
