import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { CalendarManager, type CalendarData } from "@/components/CalendarManager";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, role: "ADMIN", status: "active" },
    include: { school: true },
  });
  if (!membership) redirect("/login");

  const today = new Date(new Date().toISOString().slice(0, 10));
  const events = await prisma.calendarEvent.findMany({
    where: { schoolId: membership.schoolId, deletedAt: null },
    orderBy: { startDate: "asc" },
  });

  const data: CalendarData = {
    schoolName: membership.school.name,
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      startDate: e.startDate.toISOString().slice(0, 10),
      endDate: e.endDate ? e.endDate.toISOString().slice(0, 10) : null,
      note: e.note,
      past: (e.endDate ?? e.startDate) < today,
    })),
  };

  return <CalendarManager data={data} />;
}
