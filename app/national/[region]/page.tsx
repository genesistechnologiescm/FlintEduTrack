import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dropoutRisk } from "@/lib/dropoutRisk";
import { NationalRegion, type RegionData } from "@/components/NationalRegion";

export const dynamic = "force-dynamic";

type SchoolAgg = { id: string; name: string; division: string | null; town: string | null; crisis: boolean; students: number };
type AttAgg = { id: string; records: number; absent: number };

// Region drill-down: national → region → schools. Aggregated only — school-level
// rates, never individual students (Non-Negotiable: no PII at this layer).
export default async function RegionPage({ params }: { params: Promise<{ region: string }> }) {
  const { region: raw } = await params;
  const region = decodeURIComponent(raw);

  // Tagged templates = parameterized (no injection surface).
  const schoolsRaw = await prisma.$queryRaw<SchoolAgg[]>`
    SELECT s.id, s.name, s.division, s.town, s."isCrisisZone" AS crisis,
           count(e.id)::int AS students
    FROM "School" s
    LEFT JOIN "Enrollment" e ON e."schoolId" = s.id AND e.status = 'ACTIVE'
    WHERE s.region = ${region} AND s."deletedAt" IS NULL
    GROUP BY s.id
  `;
  if (schoolsRaw.length === 0) notFound();

  const attRaw = await prisma.$queryRaw<AttAgg[]>`
    SELECT sess."schoolId" AS id,
           count(r.id)::int AS records,
           (count(r.id) FILTER (WHERE r.status = 'ABSENT'))::int AS absent
    FROM "AttendanceSession" sess
    JOIN "AttendanceRecord" r ON r."sessionId" = sess.id
    JOIN "School" s ON s.id = sess."schoolId"
    WHERE s.region = ${region}
    GROUP BY sess."schoolId"
  `;
  const attById = new Map(attRaw.map((a) => [a.id, a]));

  // At-risk counts per school (aggregate of the same early-warning score).
  const schoolIds = schoolsRaw.map((s) => s.id);
  const marks = await prisma.attendanceRecord.findMany({
    where: { session: { schoolId: { in: schoolIds } } },
    select: { studentId: true, status: true, session: { select: { date: true, schoolId: true } } },
    orderBy: { session: { date: "desc" } },
    take: 20000,
  });
  const byStudent = new Map<string, { schoolId: string; marks: { date: string; absent: boolean }[] }>();
  for (const m of marks) {
    const g = byStudent.get(m.studentId) ?? { schoolId: m.session.schoolId, marks: [] };
    g.marks.push({ date: m.session.date.toISOString().slice(0, 10), absent: m.status === "ABSENT" });
    byStudent.set(m.studentId, g);
  }
  const atRiskBySchool = new Map<string, number>();
  for (const g of byStudent.values()) {
    if (dropoutRisk(g.marks).band === "high") {
      atRiskBySchool.set(g.schoolId, (atRiskBySchool.get(g.schoolId) ?? 0) + 1);
    }
  }

  const rate = (records: number, absent: number) =>
    records > 0 ? Math.round(((records - absent) / records) * 100) : null;

  const schools = schoolsRaw
    .map((s) => {
      const a = attById.get(s.id);
      return {
        name: s.name,
        division: s.division ?? "—",
        town: s.town ?? "—",
        crisis: s.crisis,
        students: s.students,
        rate: a ? rate(a.records, a.absent) : null,
        atRisk: atRiskBySchool.get(s.id) ?? 0,
      };
    })
    .sort((a, b) => (a.rate ?? 101) - (b.rate ?? 101)); // worst first — the signal

  const totRecords = attRaw.reduce((n, a) => n + a.records, 0);
  const totAbsent = attRaw.reduce((n, a) => n + a.absent, 0);

  const data: RegionData = {
    region,
    crisis: schoolsRaw.some((s) => s.crisis),
    students: schoolsRaw.reduce((n, s) => n + s.students, 0),
    schools: schools.length,
    rate: rate(totRecords, totAbsent),
    atRisk: [...atRiskBySchool.values()].reduce((n, c) => n + c, 0),
    rows: schools,
  };

  return <NationalRegion data={data} />;
}
