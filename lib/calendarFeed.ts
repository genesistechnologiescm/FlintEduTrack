// Upcoming calendar events for read-side surfaces (parent + student
// dashboards): the school's own events merged with the government-managed
// national exam calendar, soonest first. Server-only (Prisma).
import { prisma } from "@/lib/prisma";

export type UpcomingEvent = {
  school: string;
  title: string;
  startDate: string;
  endDate: string | null;
  note: string | null;
  national: boolean;
};

export async function upcomingEvents(schoolIds: string[], take = 6): Promise<UpcomingEvent[]> {
  const today = new Date(new Date().toISOString().slice(0, 10));
  const liveAndUpcoming = {
    deletedAt: null,
    OR: [{ startDate: { gte: today } }, { endDate: { gte: today } }],
  };

  const [school, national] = await Promise.all([
    schoolIds.length > 0
      ? prisma.calendarEvent.findMany({
          where: { schoolId: { in: schoolIds }, ...liveAndUpcoming },
          orderBy: { startDate: "asc" },
          take,
          include: { school: { select: { name: true } } },
        })
      : Promise.resolve([]),
    prisma.nationalEvent.findMany({
      where: liveAndUpcoming,
      orderBy: { startDate: "asc" },
      take,
    }),
  ]);

  return [
    ...school.map((e) => ({ school: e.school.name, title: e.title, start: e.startDate, end: e.endDate, note: e.note, national: false })),
    ...national.map((e) => ({ school: "", title: e.title, start: e.startDate, end: e.endDate, note: e.note, national: true })),
  ]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, take)
    .map((e) => ({
      school: e.school,
      title: e.title,
      startDate: e.start.toISOString().slice(0, 10),
      endDate: e.end ? e.end.toISOString().slice(0, 10) : null,
      note: e.note,
      national: e.national,
    }));
}
