import { prisma } from "@/lib/prisma";
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

  const sum = (f: (r: RegionAgg) => number) => regionsRaw.reduce((n, r) => n + f(r), 0);
  const rate = (records: number, absent: number) =>
    records > 0 ? Math.round(((records - absent) / records) * 100) : null;

  const regions = regionsRaw
    .map((r) => ({
      region: r.region,
      crisis: r.crisis,
      students: studentsByRegion.get(r.region) ?? 0,
      rate: rate(r.records, r.absent),
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
    regions,
  };

  return <NationalDashboard data={data} />;
}
