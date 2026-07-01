import { prisma } from "@/lib/prisma";
import { dropoutRisk } from "@/lib/dropoutRisk";
import { NationalDashboard, type NationalData } from "@/components/NationalDashboard";

export const dynamic = "force-dynamic";

type RegionAgg = { region: string; crisis: boolean; schools: number; records: number; absent: number };
type StudentAgg = { region: string; students: number };

// Aggregated only — no individual student PII ever leaves this layer
// (Non-Negotiable: government/national layer never sees individuals).
export default async function NationalPage() {
  const regionsRaw = await prisma.$queryRaw<RegionAgg[]>`
    SELECT s.region AS region,
           bool_or(s."isCrisisZone") AS crisis,
           count(DISTINCT s.id)::int AS schools,
           count(r.id)::int AS records,
           (count(r.id) FILTER (WHERE r.status = 'ABSENT'))::int AS absent
    FROM "School" s
    LEFT JOIN "AttendanceSession" sess ON sess."schoolId" = s.id
    LEFT JOIN "AttendanceRecord" r ON r."sessionId" = sess.id
    WHERE s."deletedAt" IS NULL
    GROUP BY s.region
  `;

  const studentsRaw = await prisma.$queryRaw<StudentAgg[]>`
    SELECT s.region AS region, count(e.id)::int AS students
    FROM "School" s
    LEFT JOIN "Enrollment" e ON e."schoolId" = s.id AND e.status = 'ACTIVE'
    WHERE s."deletedAt" IS NULL
    GROUP BY s.region
  `;
  const studentsByRegion = new Map(studentsRaw.map((r) => [r.region, r.students]));

  // Dropout-risk aggregate. We compute each student's risk from their attendance,
  // then expose ONLY the counts per region — no individual ever leaves this layer.
  const schools = await prisma.school.findMany({ where: { deletedAt: null }, select: { id: true, region: true, isCrisisZone: true } });
  const schoolMeta = new Map(schools.map((s) => [s.id, { region: s.region, crisis: s.isCrisisZone }]));
  const marks = await prisma.attendanceRecord.findMany({
    select: { studentId: true, status: true, session: { select: { date: true, schoolId: true } } },
    orderBy: { session: { date: "desc" } },
    take: 20000,
  });
  const byStudent = new Map<string, { region: string; crisis: boolean; marks: { date: string; absent: boolean }[] }>();
  for (const m of marks) {
    const meta = schoolMeta.get(m.session.schoolId);
    if (!meta) continue;
    const g = byStudent.get(m.studentId) ?? { region: meta.region, crisis: meta.crisis, marks: [] };
    g.marks.push({ date: m.session.date.toISOString().slice(0, 10), absent: m.status === "ABSENT" });
    byStudent.set(m.studentId, g);
  }
  const atRiskByRegion = new Map<string, number>();
  let atRiskTotal = 0, crisisAtRisk = 0, restAtRisk = 0;
  for (const g of byStudent.values()) {
    if (dropoutRisk(g.marks).band === "high") {
      atRiskTotal++;
      atRiskByRegion.set(g.region, (atRiskByRegion.get(g.region) ?? 0) + 1);
      if (g.crisis) crisisAtRisk++;
      else restAtRisk++;
    }
  }

  const sum = (f: (r: RegionAgg) => number) => regionsRaw.reduce((n, r) => n + f(r), 0);
  const rate = (records: number, absent: number) =>
    records > 0 ? Math.round(((records - absent) / records) * 100) : null;

  const regions = regionsRaw
    .map((r) => ({
      region: r.region,
      crisis: r.crisis,
      students: studentsByRegion.get(r.region) ?? 0,
      rate: rate(r.records, r.absent),
      atRisk: atRiskByRegion.get(r.region) ?? 0,
    }))
    .sort((a, b) => b.students - a.students);

  const crisisRecords = sum((r) => (r.crisis ? r.records : 0));
  const crisisAbsent = sum((r) => (r.crisis ? r.absent : 0));
  const restRecords = sum((r) => (!r.crisis ? r.records : 0));
  const restAbsent = sum((r) => (!r.crisis ? r.absent : 0));

  const data: NationalData = {
    totalSchools: sum((r) => r.schools),
    totalStudents: studentsRaw.reduce((n, r) => n + r.students, 0),
    nationalRate: rate(sum((r) => r.records), sum((r) => r.absent)),
    crisisRate: rate(crisisRecords, crisisAbsent),
    restRate: rate(restRecords, restAbsent),
    atRiskTotal,
    crisisAtRisk,
    restAtRisk,
    regions,
  };

  return <NationalDashboard data={data} />;
}
