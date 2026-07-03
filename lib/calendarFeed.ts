// Upcoming school-calendar events for read-side surfaces (parent + student
// dashboards). Server-only (Prisma).
import { prisma } from "@/lib/prisma";

export type UpcomingEvent = {
  school: string;
  title: string;
  startDate: string;
  endDate: string | null;
  note: string | null;
};

export async function upcomingEvents(schoolIds: string[], take = 6): Promise<UpcomingEvent[]> {
  if (schoolIds.length === 0) return [];
  const today = new Date(new Date().toISOString().slice(0, 10));
  const rows = await prisma.calendarEvent.findMany({
    where: {
      schoolId: { in: schoolIds },
      deletedAt: null,
      OR: [{ startDate: { gte: today } }, { endDate: { gte: today } }],
    },
    orderBy: { startDate: "asc" },
    take,
    include: { school: { select: { name: true } } },
  });
  return rows.map((e) => ({
    school: e.school.name,
    title: e.title,
    startDate: e.startDate.toISOString().slice(0, 10),
    endDate: e.endDate ? e.endDate.toISOString().slice(0, 10) : null,
    note: e.note,
  }));
}
