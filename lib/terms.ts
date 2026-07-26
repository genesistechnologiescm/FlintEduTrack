import { prisma } from "@/lib/prisma";

export type TermOption = { id: string; label: string; order: number };

// Every term of the school's current academic year, in order, plus which one is
// "now". Grades must always be read for ONE term: the Grade table keys on
// (student, subject, term, sequence), so querying without a termId mixes terms
// together and a later term's Sequence 1 silently masks an earlier one.
export async function schoolTerms(
  schoolId: string,
): Promise<{ terms: TermOption[]; currentTermId: string | null }> {
  const year = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });
  if (!year) return { terms: [], currentTermId: null };

  const rows = await prisma.term.findMany({
    where: { academicYearId: year.id },
    orderBy: { order: "asc" },
    select: { id: true, label: true, order: true, startDate: true, endDate: true },
  });
  if (rows.length === 0) return { terms: [], currentTermId: null };

  const now = new Date();
  // The term we're inside; otherwise the most recent one that has started
  // (holidays between terms), falling back to the first.
  const inSession = rows.find((t) => t.startDate <= now && now <= t.endDate);
  const started = [...rows].reverse().find((t) => t.startDate <= now);
  const current = inSession ?? started ?? rows[0];

  return {
    terms: rows.map((t) => ({ id: t.id, label: t.label, order: t.order })),
    currentTermId: current.id,
  };
}
