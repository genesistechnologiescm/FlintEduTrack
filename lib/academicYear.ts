// Server-side helper — deliberately NOT in a "use server" file, so it is never
// registered as a Server Action (public RPC endpoint). Callers pass a schoolId
// they have already authorized via their own admin/staff context.
//
// Cameroon academic year ≈ September → July, 3 terms, 2 sequences each. A fresh
// school has none, which would block enrolment + timetabling, so the first time
// setup needs a year we provision a sensible default automatically.
import { prisma } from "@/lib/prisma";

export async function ensureCurrentYear(schoolId: string) {
  const existing = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });
  if (existing) return existing;

  const now = new Date();
  const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1; // month 8 = Sept
  const endYear = startYear + 1;
  const year = await prisma.academicYear.create({
    data: {
      schoolId,
      label: `${startYear}/${endYear}`,
      startDate: new Date(startYear, 8, 1), // 1 Sept
      endDate: new Date(endYear, 6, 31), // 31 Jul
      isCurrent: true,
    },
  });
  await prisma.term.createMany({
    data: [
      { academicYearId: year.id, label: "First Term", order: 1, sequenceCount: 2, startDate: new Date(startYear, 8, 1), endDate: new Date(startYear, 11, 15) },
      { academicYearId: year.id, label: "Second Term", order: 2, sequenceCount: 2, startDate: new Date(endYear, 0, 6), endDate: new Date(endYear, 3, 5) },
      { academicYearId: year.id, label: "Third Term", order: 3, sequenceCount: 2, startDate: new Date(endYear, 3, 20), endDate: new Date(endYear, 6, 15) },
    ],
  });
  return year;
}
