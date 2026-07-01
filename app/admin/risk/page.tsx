import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { dropoutRisk } from "@/lib/dropoutRisk";
import { RiskRadar, type RiskData } from "@/components/RiskRadar";

export const dynamic = "force-dynamic";

export default async function RiskPage() {
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

  const [enrollments, records] = await Promise.all([
    prisma.enrollment.findMany({
      where: { schoolId, status: "ACTIVE" },
      include: { student: true, classGroup: { select: { name: true } } },
    }),
    prisma.attendanceRecord.findMany({
      where: { session: { schoolId } },
      select: { studentId: true, status: true, session: { select: { date: true } } },
      orderBy: { session: { date: "desc" } },
      take: 5000,
    }),
  ]);

  // Group recent marks per student.
  const byStudent = new Map<string, { date: string; absent: boolean }[]>();
  for (const r of records) {
    const list = byStudent.get(r.studentId) ?? [];
    list.push({ date: r.session.date.toISOString().slice(0, 10), absent: r.status === "ABSENT" });
    byStudent.set(r.studentId, list);
  }

  const rows = enrollments.map((e) => {
    const risk = dropoutRisk(byStudent.get(e.studentId) ?? []);
    return {
      studentId: e.studentId,
      name: `${e.student.firstName} ${e.student.lastName}`,
      className: e.classGroup.name,
      score: risk.score,
      band: risk.band,
      reasons: risk.reasons,
    };
  });

  const counts = { high: 0, watch: 0, low: 0 };
  for (const r of rows) counts[r.band]++;

  // Show the ones that need attention, most at-risk first.
  const flagged = rows
    .filter((r) => r.band !== "low")
    .sort((a, b) => b.score - a.score);

  const data: RiskData = {
    schoolName: membership.school.name,
    total: rows.length,
    counts,
    flagged,
  };

  return <RiskRadar data={data} />;
}
