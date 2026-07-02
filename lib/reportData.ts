// Shared loader for a student's report card — used by the HTML page and the PDF
// route so authorization and data stay identical in both. Caller must pass the
// authenticated user's id; we verify they are a linked parent, staff of the
// student's school, or the student themself.
import { prisma } from "@/lib/prisma";
import { avgOf, groupBySubject, type SubjectGrade } from "@/lib/grades";

export type ReportPayload = {
  studentName: string;
  school: string;
  region: string;
  className: string;
  subjects: SubjectGrade[];
  overall: number | null;
  attendanceRate: number | null;
};

export async function loadReportData(
  studentId: string,
  userId: string,
): Promise<{ ok: true; data: ReportPayload } | { ok: false; reason: "not_found" | "forbidden" }> {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return { ok: false, reason: "not_found" };

  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId },
    include: { school: true, classGroup: true },
    orderBy: { enrolledAt: "desc" },
  });
  if (!enrollment) return { ok: false, reason: "not_found" };

  const [link, staff, selfAccount] = await Promise.all([
    prisma.parentLink.findFirst({ where: { parentUserId: userId, studentId, status: "active" } }),
    prisma.schoolMembership.findFirst({ where: { userId, schoolId: enrollment.schoolId, status: "active" } }),
    prisma.studentAccount.findFirst({ where: { id: userId, studentId } }),
  ]);
  if (!link && !staff && !selfAccount) return { ok: false, reason: "forbidden" };

  const gradeRows = await prisma.grade.findMany({
    where: { studentId },
    include: { subject: { select: { name: true } } },
    orderBy: { sequence: "asc" },
  });
  const subjects = groupBySubject(
    gradeRows.map((g) => ({ sequence: g.sequence, score: Number(g.score), subject: { name: g.subject.name } })),
  );

  const records = await prisma.attendanceRecord.findMany({ where: { studentId } });
  const present = records.filter((r) => r.status !== "ABSENT").length;

  return {
    ok: true,
    data: {
      studentName: `${student.firstName} ${student.lastName}`,
      school: enrollment.school.name,
      region: enrollment.school.region,
      className: enrollment.classGroup.name,
      subjects,
      overall: avgOf(subjects.map((s) => s.avg)),
      attendanceRate: records.length > 0 ? Math.round((present / records.length) * 100) : null,
    },
  };
}
