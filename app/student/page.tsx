import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { avgOf, groupBySubject } from "@/lib/grades";
import { StudentDashboard, type StudentData } from "@/components/StudentDashboard";

export const dynamic = "force-dynamic";

export default async function StudentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const account = await prisma.studentAccount.findUnique({
    where: { id: user.id },
    include: { student: true },
  });
  if (!account) redirect("/login");
  const studentId = account.studentId;

  const [enrollment, records, gradeRows] = await Promise.all([
    prisma.enrollment.findFirst({
      where: { studentId, status: "ACTIVE" },
      include: { school: true, classGroup: true },
      orderBy: { enrolledAt: "desc" },
    }),
    prisma.attendanceRecord.findMany({
      where: { studentId },
      include: { session: { select: { date: true } } },
      orderBy: { session: { date: "desc" } },
      take: 40,
    }),
    prisma.grade.findMany({ where: { studentId }, include: { subject: { select: { name: true } } }, orderBy: { sequence: "asc" } }),
  ]);

  const present = records.filter((r) => r.status !== "ABSENT").length;
  const total = records.length;
  const subjects = groupBySubject(
    gradeRows.map((g) => ({ sequence: g.sequence, score: Number(g.score), subject: { name: g.subject.name } })),
  );

  // Lessons for the student's class (or whole-subject), grouped by subject.
  const lessonsRaw = enrollment
    ? await prisma.lessonResource.findMany({
        where: {
          schoolId: enrollment.schoolId,
          deletedAt: null,
          OR: [{ classGroupId: enrollment.classGroupId }, { classGroupId: null }],
        },
        orderBy: { createdAt: "desc" },
        include: { subject: { select: { name: true } } },
      })
    : [];
  const bySubject = new Map<string, StudentData["lessons"][number]>();
  for (const r of lessonsRaw) {
    const g = bySubject.get(r.subject.name) ?? { subject: r.subject.name, items: [] };
    g.items.push({ id: r.id, title: r.title, type: r.type, url: r.url, body: r.body });
    bySubject.set(r.subject.name, g);
  }

  const data: StudentData = {
    name: `${account.student.firstName} ${account.student.lastName}`,
    school: enrollment?.school.name ?? "—",
    className: enrollment?.classGroup.name ?? "—",
    studentId,
    rate: total > 0 ? Math.round((present / total) * 100) : null,
    recent: records.slice(0, 8).map((r) => ({ date: r.session.date.toISOString().slice(5, 10), absent: r.status === "ABSENT" })),
    subjects,
    overall: avgOf(subjects.map((s) => s.avg)),
    lessons: [...bySubject.values()],
  };

  return <StudentDashboard data={data} />;
}
