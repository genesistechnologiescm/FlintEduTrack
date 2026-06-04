import { prisma } from "@/lib/prisma";
import { AdminDashboard, type AdminData } from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default async function AdminPage() {
  const school = await prisma.school.findFirst();
  if (!school) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <p className="text-muted">No school found. Run the seed script first.</p>
      </main>
    );
  }

  const jsDay = new Date().getDay(); // 0=Sun..6=Sat ; our scheme Mon=1..Sat=6
  const dateISO = todayISO();
  const todayDate = new Date(`${dateISO}T00:00:00.000Z`);

  const dayStart = new Date(`${dateISO}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateISO}T23:59:59.999Z`);

  const [slots, sessions, studentsEnrolled, notifs] = await Promise.all([
    prisma.timetableSlot.findMany({
      where: { schoolId: school.id, dayOfWeek: jsDay },
      include: { subject: true, classGroup: true, teacher: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.attendanceSession.findMany({
      where: { schoolId: school.id, date: todayDate },
      include: { records: true },
    }),
    prisma.enrollment.count({ where: { schoolId: school.id, status: "ACTIVE" } }),
    prisma.notificationLog.findMany({
      where: { serverSentAt: { gte: dayStart, lte: dayEnd } },
      orderBy: { serverSentAt: "desc" },
    }),
  ]);

  const sessionBySlot = new Map(sessions.map((s) => [s.timetableSlotId, s]));

  let present = 0;
  let absent = 0;
  let total = 0;
  for (const s of sessions) {
    for (const r of s.records) {
      total++;
      if (r.status === "ABSENT") absent++;
      else present++; // PRESENT / EXCUSED / PRE_AUTHORISED count as not-absent
    }
  }

  const periods = slots.map((slot) => {
    const sess = sessionBySlot.get(slot.id);
    const records = sess?.records ?? [];
    return {
      id: slot.id,
      subject: slot.subject.name,
      className: slot.classGroup.name,
      teacher: slot.teacher.displayName,
      time: `${slot.startTime}–${slot.endTime}`,
      submitted: Boolean(sess?.submittedAt),
      present: records.filter((r) => r.status !== "ABSENT").length,
      absent: records.filter((r) => r.status === "ABSENT").length,
    };
  });

  // Parent-alert stats (today)
  const alertsSent = notifs.filter((n) => n.deliveryStatus === "SENT").length;
  const alertsQueued = notifs.filter((n) => n.deliveryStatus === "QUEUED").length;
  const alertsCost = notifs.reduce((sum, n) => sum + Number(n.costFcfa), 0);
  const recent = notifs.slice(0, 5);
  const recentParents = await prisma.user.findMany({
    where: { id: { in: [...new Set(recent.map((n) => n.parentUserId))] } },
    select: { id: true, phone: true },
  });
  const phoneById = new Map(recentParents.map((p) => [p.id, p.phone]));

  const data: AdminData = {
    schoolName: school.name,
    attendanceRate: total > 0 ? Math.round((present / total) * 100) : null,
    periodsSubmitted: sessions.filter((s) => s.submittedAt).length,
    periodsScheduled: slots.length,
    absencesToday: absent,
    studentsEnrolled,
    periods,
    alerts: {
      sent: alertsSent,
      queued: alertsQueued,
      costFcfa: alertsCost,
      recent: recent.map((n) => ({
        phone: phoneById.get(n.parentUserId) ?? "—",
        status: n.deliveryStatus,
      })),
    },
  };

  return <AdminDashboard data={data} />;
}
