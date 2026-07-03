import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { WelfarePanel, type AtRiskRow } from "@/components/WelfarePanel";
import { wellbeingWeekStartISO } from "@/lib/wellbeing";

export const dynamic = "force-dynamic";

type Stage = "CONCERN" | "MEETING" | "AT_RISK";
function stageFor(absences: number): Stage {
  if (absences >= 5) return "AT_RISK";
  if (absences >= 3) return "MEETING";
  return "CONCERN";
}

export default async function WelfarePage() {
  // Scoped gate: welfare is for FULL or WELFARE admins.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const membership = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, role: "ADMIN", status: "active", adminScope: { in: ["FULL", "WELFARE"] } },
  });
  if (!membership) redirect("/login");

  const school = await prisma.school.findFirst();
  if (!school) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <p className="text-muted">No school found. Run the seed script first.</p>
      </main>
    );
  }

  // Unexcused-absence counts per student (this school).
  const absentRecords = await prisma.attendanceRecord.findMany({
    where: { status: "ABSENT", session: { schoolId: school.id } },
    select: { studentId: true },
  });
  const counts = new Map<string, number>();
  for (const r of absentRecords) counts.set(r.studentId, (counts.get(r.studentId) ?? 0) + 1);

  const flagged = [...counts.entries()]
    .filter(([, c]) => c >= 2) // threshold
    .sort((a, b) => b[1] - a[1]);

  const ids = flagged.map(([id]) => id);
  const [students, cases] = await Promise.all([
    prisma.student.findMany({ where: { id: { in: ids } } }),
    prisma.welfareCase.findMany({
      where: { schoolId: school.id, studentId: { in: ids } },
      include: { events: { orderBy: { occurredAt: "desc" } } },
    }),
  ]);
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const caseByStudent = new Map(cases.map((c) => [c.studentId, c]));

  const rows: AtRiskRow[] = flagged.map(([studentId, absences]) => {
    const student = studentMap.get(studentId);
    const c = caseByStudent.get(studentId);
    return {
      studentId,
      name: student ? `${student.lastName} ${student.firstName}` : "—",
      absences,
      stage: stageFor(absences),
      events: (c?.events ?? []).map((e) => ({
        type: e.type as AtRiskRow["events"][number]["type"],
        description: e.description,
        when: e.occurredAt.toISOString().slice(0, 10),
      })),
    };
  });

  // This week's teacher wellbeing reads flagged "needs attention" — the human
  // signal beside the absence-count signal.
  const wbFlags = await prisma.wellbeingSnapshot.findMany({
    where: { schoolId: school.id, weekStart: new Date(wellbeingWeekStartISO()), level: "NEEDS_ATTENTION" },
    include: { student: { select: { firstName: true, lastName: true } } },
  });
  const wellbeingFlags = wbFlags.map((w) => `${w.student.lastName} ${w.student.firstName}`.trim());

  return <WelfarePanel rows={rows} wellbeingFlags={wellbeingFlags} />;
}
