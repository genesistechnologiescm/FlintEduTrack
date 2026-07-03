import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { AbsencesPanel, type AbsencesData } from "@/components/AbsencesPanel";

export const dynamic = "force-dynamic";

// Recent unexcused absences for the school, newest first — the admin's desk for
// reclassifying with documentation (clinic note, family notice, …).
export default async function AbsencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, role: "ADMIN", status: "active" },
    include: { school: true },
  });
  if (!membership) redirect("/login");
  const schoolId = membership.schoolId;

  const since = new Date(Date.now() - 14 * 86_400_000);
  const [absences, excused] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { status: "ABSENT", session: { schoolId, date: { gte: since } } },
      include: {
        student: { select: { firstName: true, lastName: true } },
        session: { select: { date: true, subjectId: true, classGroupId: true } },
      },
      orderBy: { session: { date: "desc" } },
      take: 200,
    }),
    prisma.attendanceRecord.findMany({
      where: { status: "EXCUSED", session: { schoolId, date: { gte: since } } },
      include: {
        student: { select: { firstName: true, lastName: true } },
        session: { select: { date: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);

  // Resolve subject/class names in two lookups (avoid deep joins per row).
  const subjectIds = [...new Set(absences.map((a) => a.session.subjectId))];
  const classIds = [...new Set(absences.map((a) => a.session.classGroupId))];
  const [subjects, classes] = await Promise.all([
    subjectIds.length ? prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    classIds.length ? prisma.classGroup.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
  ]);
  const subjName = new Map(subjects.map((s) => [s.id, s.name]));
  const className = new Map(classes.map((c) => [c.id, c.name]));

  const data: AbsencesData = {
    schoolName: membership.school.name,
    absences: absences.map((a) => ({
      recordId: a.id,
      student: `${a.student.firstName} ${a.student.lastName}`,
      className: className.get(a.session.classGroupId) ?? "—",
      subject: subjName.get(a.session.subjectId) ?? "—",
      date: a.session.date.toISOString().slice(0, 10),
    })),
    excused: excused.map((e) => ({
      student: `${e.student.firstName} ${e.student.lastName}`,
      date: e.session.date.toISOString().slice(0, 10),
      reason: e.note ?? "",
    })),
  };

  return <AbsencesPanel data={data} />;
}
