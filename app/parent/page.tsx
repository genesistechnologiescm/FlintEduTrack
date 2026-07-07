import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ParentDashboard, type ParentData } from "@/components/ParentDashboard";
import { avgOf, groupBySubject } from "@/lib/grades";
import { upcomingEvents } from "@/lib/calendarFeed";

export const dynamic = "force-dynamic";

// A parent sees ONLY their own linked children (authz by auth.uid + RLS).
export default async function ParentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { displayName: true } });

  const links = await prisma.parentLink.findMany({
    where: { parentUserId: user.id, status: "active" },
    include: { student: true },
  });

  const children: ParentData["children"] = [];
  for (const link of links) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId: link.studentId },
      include: { school: true, classGroup: true },
      orderBy: { enrolledAt: "desc" },
    });
    const records = await prisma.attendanceRecord.findMany({
      where: { studentId: link.studentId },
      include: { session: { select: { date: true, subjectId: true } } },
      orderBy: { session: { date: "desc" } },
      take: 200,
    });
    const present = records.filter((r) => r.status !== "ABSENT").length;
    const total = records.length;

    // Subject-level attendance (Phase-1 data, now surfaced): which class is
    // this child actually missing? Worst subjects first — that's the signal.
    const perSubject = new Map<string, { total: number; absent: number }>();
    for (const r of records) {
      const s = perSubject.get(r.session.subjectId) ?? { total: 0, absent: 0 };
      s.total++;
      if (r.status === "ABSENT") s.absent++;
      perSubject.set(r.session.subjectId, s);
    }
    const subjectIds = [...perSubject.keys()];
    const subjectNames = subjectIds.length
      ? await prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true } })
      : [];
    const nameById = new Map(subjectNames.map((s) => [s.id, s.name]));
    const bySubject = subjectIds
      .map((id) => {
        const s = perSubject.get(id)!;
        return {
          subject: nameById.get(id) ?? "—",
          rate: Math.round(((s.total - s.absent) / s.total) * 100),
          total: s.total,
        };
      })
      .sort((a, b) => a.rate - b.rate);

    const gradeRows = await prisma.grade.findMany({
      where: { studentId: link.studentId },
      include: { subject: { select: { name: true } } },
      orderBy: { sequence: "asc" },
    });
    const subjects = groupBySubject(
      gradeRows.map((g) => ({ sequence: g.sequence, score: Number(g.score), subject: { name: g.subject.name } })),
    );

    children.push({
      studentId: link.studentId,
      name: `${link.student.firstName} ${link.student.lastName}`,
      school: enrollment?.school.name ?? "—",
      className: enrollment?.classGroup.name ?? "—",
      rate: total > 0 ? Math.round((present / total) * 100) : null,
      recent: records.slice(0, 8).map((r) => ({
        date: r.session.date.toISOString().slice(5, 10),
        absent: r.status === "ABSENT",
      })),
      bySubject,
      subjects,
      overall: avgOf(subjects.map((s) => s.avg)),
    });
  }

  const notifs = await prisma.notificationLog.findMany({
    where: { parentUserId: user.id },
    orderBy: { serverSentAt: "desc" },
    take: 10,
  });

  const receipts = await prisma.announcementReceipt.findMany({
    where: { parentUserId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { announcement: { select: { title: true, body: true, createdAt: true } } },
  });

  const events = await upcomingEvents([...new Set(links.map((l) => l.schoolId))]);

  const data: ParentData = {
    parentName: me?.displayName ?? "Parent",
    children,
    alerts: notifs.map((n) => ({ type: n.eventType, date: n.serverSentAt.toISOString().slice(0, 10) })),
    announcements: receipts.map((r) => ({
      title: r.announcement.title,
      body: r.announcement.body,
      date: r.announcement.createdAt.toISOString().slice(0, 10),
    })),
    events,
  };

  return <ParentDashboard data={data} />;
}
