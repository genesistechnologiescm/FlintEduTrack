import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ReportCard, type ReportData } from "@/components/ReportCard";
import { avgOf, groupBySubject } from "@/lib/grades";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) notFound();
  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId },
    include: { school: true, classGroup: true },
    orderBy: { enrolledAt: "desc" },
  });
  if (!enrollment) notFound();

  // Authz: a linked parent of this student, or staff of the student's school.
  const [link, staff] = await Promise.all([
    prisma.parentLink.findFirst({ where: { parentUserId: user.id, studentId, status: "active" } }),
    prisma.schoolMembership.findFirst({ where: { userId: user.id, schoolId: enrollment.schoolId, status: "active" } }),
  ]);
  if (!link && !staff) redirect("/login");

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

  const data: ReportData = {
    studentName: `${student.firstName} ${student.lastName}`,
    school: enrollment.school.name,
    region: enrollment.school.region,
    className: enrollment.classGroup.name,
    subjects,
    overall: avgOf(subjects.map((s) => s.avg)),
    attendanceRate: records.length > 0 ? Math.round((present / records.length) * 100) : null,
  };

  return <ReportCard data={data} />;
}
