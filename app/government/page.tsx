import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { GovernmentDashboard, type GovernmentData } from "@/components/GovernmentDashboard";

export const dynamic = "force-dynamic";

type RegionAgg = { region: string; crisis: boolean; schools: number; records: number; absent: number };
type SchoolAgg = { name: string; region: string; crisis: boolean; students: number; records: number; absent: number };

// Layer 3 — Ministry view. AGGREGATE ONLY: no individual student ever appears here
// (Non-Negotiable: the government layer never sees individuals). Read-only.
export default async function GovernmentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { isGovernment: true, isFlintAdmin: true } });
  if (!me || (!me.isGovernment && !me.isFlintAdmin)) redirect("/login");

  const regionsRaw = await prisma.$queryRaw<RegionAgg[]>`
    SELECT s.region AS region,
           bool_or(s."isCrisisZone") AS crisis,
           count(DISTINCT s.id)::int AS schools,
           count(r.id)::int AS records,
           (count(r.id) FILTER (WHERE r.status = 'ABSENT'))::int AS absent
    FROM "School" s
    LEFT JOIN "AttendanceSession" sess ON sess."schoolId" = s.id
    LEFT JOIN "AttendanceRecord" r ON r."sessionId" = sess.id
    WHERE s."deletedAt" IS NULL AND s."isTest" = false
    GROUP BY s.region
  `;
  const studentsRaw = await prisma.$queryRaw<{ region: string; students: number }[]>`
    SELECT s.region AS region, count(e.id)::int AS students
    FROM "School" s
    LEFT JOIN "Enrollment" e ON e."schoolId" = s.id AND e.status = 'ACTIVE'
    WHERE s."deletedAt" IS NULL AND s."isTest" = false
    GROUP BY s.region
  `;
  const schoolsRaw = await prisma.$queryRaw<SchoolAgg[]>`
    SELECT s.name AS name, s.region AS region, s."isCrisisZone" AS crisis,
           count(DISTINCT e.id)::int AS students,
           count(r.id)::int AS records,
           (count(r.id) FILTER (WHERE r.status = 'ABSENT'))::int AS absent
    FROM "School" s
    LEFT JOIN "Enrollment" e ON e."schoolId" = s.id AND e.status = 'ACTIVE'
    LEFT JOIN "AttendanceSession" sess ON sess."schoolId" = s.id
    LEFT JOIN "AttendanceRecord" r ON r."sessionId" = sess.id
    WHERE s."deletedAt" IS NULL AND s."isTest" = false
    GROUP BY s.id, s.name, s.region, s."isCrisisZone"
    ORDER BY s.region, s.name
  `;

  const studentsByRegion = new Map(studentsRaw.map((r) => [r.region, r.students]));
  const sum = (f: (r: RegionAgg) => number) => regionsRaw.reduce((n, r) => n + f(r), 0);
  const rate = (records: number, absent: number) => (records > 0 ? Math.round(((records - absent) / records) * 100) : null);

  const regions = regionsRaw
    .map((r) => ({ region: r.region, crisis: r.crisis, students: studentsByRegion.get(r.region) ?? 0, rate: rate(r.records, r.absent) }))
    .sort((a, b) => b.students - a.students);
  const schools = schoolsRaw.map((s) => ({ name: s.name, region: s.region, crisis: s.crisis, students: s.students, rate: rate(s.records, s.absent) }));

  const data: GovernmentData = {
    generatedAt: new Date().toISOString().slice(0, 10),
    totalSchools: sum((r) => r.schools),
    totalStudents: studentsRaw.reduce((n, r) => n + r.students, 0),
    nationalRate: rate(sum((r) => r.records), sum((r) => r.absent)),
    crisisRate: rate(sum((r) => (r.crisis ? r.records : 0)), sum((r) => (r.crisis ? r.absent : 0))),
    restRate: rate(sum((r) => (!r.crisis ? r.records : 0)), sum((r) => (!r.crisis ? r.absent : 0))),
    regions,
    schools,
  };

  return <GovernmentDashboard data={data} />;
}
