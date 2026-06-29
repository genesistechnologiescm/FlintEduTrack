import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ParentDashboard, type ParentData } from "@/components/ParentDashboard";
import { avgOf, groupBySubject } from "@/lib/grades";

export const dynamic = "force-dynamic";

// A parent sees ONLY their own linked children (authz by auth.uid + RLS).
export default async function ParentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
      include: { session: { select: { date: true } } },
      orderBy: { session: { date: "desc" } },
      take: 40,
    });
    const present = records.filter((r) => r.status !== "ABSENT").length;
    const total = records.length;

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

  const data: ParentData = {
    children,
    alerts: notifs.map((n) => ({ type: n.eventType, date: n.serverSentAt.toISOString().slice(0, 10) })),
    announcements: receipts.map((r) => ({
      title: r.announcement.title,
      body: r.announcement.body,
      date: r.announcement.createdAt.toISOString().slice(0, 10),
    })),
  };

  return <ParentDashboard data={data} />;
}
