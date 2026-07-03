import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Government CSV export with a custom date range and k-anonymity (k=5):
// any school row resting on fewer than 5 students or 5 attendance records has
// its figures SUPPRESSED — aggregate statistics must never let an official
// infer an individual child (Phase-3 export hardening).
const K = 5;

function isDate(s: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");
  const to = isDate(toParam) ? toParam : new Date().toISOString().slice(0, 10);
  const from = isDate(fromParam) ? fromParam : new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

  type Row = {
    region: string;
    division: string | null;
    name: string;
    crisis: boolean;
    students: number;
    records: number;
    absent: number;
  };
  // Tagged template = parameterized (dates validated to ISO shape above too).
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT s.region, s.division, s.name, s."isCrisisZone" AS crisis,
           (SELECT count(*) FROM "Enrollment" e WHERE e."schoolId" = s.id AND e.status = 'ACTIVE')::int AS students,
           count(r.id)::int AS records,
           (count(r.id) FILTER (WHERE r.status = 'ABSENT'))::int AS absent
    FROM "School" s
    LEFT JOIN "AttendanceSession" sess
      ON sess."schoolId" = s.id
     AND sess.date >= ${from}::date AND sess.date <= ${to}::date
    LEFT JOIN "AttendanceRecord" r ON r."sessionId" = sess.id
    WHERE s."deletedAt" IS NULL
    GROUP BY s.id
    ORDER BY s.region, s.name
  `;

  let suppressed = 0;
  const esc = (c: string | number) => `"${String(c).replace(/"/g, '""')}"`;
  const lines: string[] = [
    [esc("EduTrack — National Attendance Report")].join(","),
    [esc("Generated"), esc(new Date().toISOString().slice(0, 10))].join(","),
    [esc("Period"), esc(`${from} to ${to}`)].join(","),
    [esc(`Privacy: figures for groups smaller than ${K} are suppressed (k-anonymity)`)].join(","),
    "",
    ["Region", "Division", "School", "Crisis zone", "Students", "Records", "Absences", "Attendance rate %"].map(esc).join(","),
  ];
  for (const r of rows) {
    const small = r.students < K || r.records < K;
    if (small) suppressed++;
    const rate = r.records > 0 ? Math.round(((r.records - r.absent) / r.records) * 100) : null;
    lines.push(
      [
        r.region,
        r.division ?? "",
        r.name,
        r.crisis ? "yes" : "no",
        small ? `suppressed (n<${K})` : r.students,
        small ? `suppressed (n<${K})` : r.records,
        small ? `suppressed (n<${K})` : r.absent,
        small ? `suppressed (n<${K})` : rate === null ? "" : rate,
      ]
        .map(esc)
        .join(","),
    );
  }
  lines.push("", [esc("Rows suppressed for privacy"), esc(suppressed)].join(","));

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="edutrack-report-${from}-to-${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
