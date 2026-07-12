import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { NationalCalendarManager, type NationalCalendarData } from "@/components/NationalCalendarManager";

export const dynamic = "force-dynamic";

// Government-only management of the national exam calendar. The events it
// publishes appear read-only on every school, parent and student calendar.
export default async function GovernmentCalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isGovernment: true, isFlintAdmin: true },
  });
  if (!me || (!me.isGovernment && !me.isFlintAdmin)) redirect("/login");

  const events = await prisma.nationalEvent.findMany({
    where: { deletedAt: null },
    orderBy: { startDate: "asc" },
  });

  const todayISO = new Date().toISOString().slice(0, 10);
  const data: NationalCalendarData = {
    events: events.map((e) => {
      const start = e.startDate.toISOString().slice(0, 10);
      const end = e.endDate ? e.endDate.toISOString().slice(0, 10) : null;
      return {
        id: e.id,
        title: e.title,
        startDate: start,
        endDate: end,
        note: e.note,
        past: (end ?? start) < todayISO,
      };
    }),
  };

  return <NationalCalendarManager data={data} />;
}
