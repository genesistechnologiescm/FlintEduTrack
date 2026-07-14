import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { formatWat, isOnTime, watTodayISO } from "@/lib/gate";
import { AdminDashboard, type AdminData } from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default async function AdminPage() {
  // Authorization: the dashboard is the admin home (any admin scope — FULL/FINANCE/
  // WELFARE). Non-admins (teacher / parent / student / government) must never read it.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const membership = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, role: "ADMIN", status: "active" },
  });
  if (!membership) redirect("/login");

  const school = await prisma.school.findUnique({ where: { id: membership.schoolId } });
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

  // Fees stat is money data — only FULL/FINANCE admins see it (mirrors /admin/fees).
  const canSeeFees = membership.adminScope === "FULL" || membership.adminScope === "FINANCE";
  const monthStart = new Date(`${dateISO.slice(0, 7)}-01T00:00:00.000Z`);

  const [slots, sessions, studentsEnrolled, notifs, feeAgg] = await Promise.all([
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
    canSeeFees
      ? prisma.payment.aggregate({
          _sum: { amount: true },
          _count: true,
          where: { schoolId: school.id, createdAt: { gte: monthStart } },
        })
      : Promise.resolve(null),
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

  // Gate check-ins: who is on site today, and when did they arrive?
  const [staffMembers, todaysCheckIns] = await Promise.all([
    prisma.schoolMembership.findMany({
      where: { schoolId: school.id, status: "active", role: { in: ["ADMIN", "TEACHER"] } },
      include: { user: { select: { id: true, displayName: true } } },
    }),
    prisma.gateCheckIn.findMany({ where: { schoolId: school.id, date: new Date(watTodayISO()) } }),
  ]);
  const checkInByUser = new Map(todaysCheckIns.map((c) => [c.userId, c]));
  const gate = staffMembers
    .map((m) => {
      const c = checkInByUser.get(m.userId);
      return {
        name: m.user.displayName,
        title: m.title,
        time: c ? formatWat(c.arrivedAt) : null,
        onTime: c ? isOnTime(c.arrivedAt) : null,
      };
    })
    .sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));

  // Reach / cost profile: how many of this school's parents need paid SMS?
  const parentLinks = await prisma.parentLink.findMany({
    where: { schoolId: school.id, status: "active" },
    select: { parent: { select: { id: true, contactCapability: true } } },
    distinct: ["parentUserId"],
  });
  const reach = { smartphone: 0, whatsapp: 0, smsOnly: 0, voice: 0, unknown: 0, total: parentLinks.length };
  for (const l of parentLinks) {
    if (l.parent.contactCapability === "SMARTPHONE") reach.smartphone++;
    else if (l.parent.contactCapability === "WHATSAPP") reach.whatsapp++;
    else if (l.parent.contactCapability === "SMS_ONLY") reach.smsOnly++;
    else if (l.parent.contactCapability === "VOICE_ONLY") reach.voice++;
    else reach.unknown++;
  }

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
    reach,
    gate,
    feesMonth: feeAgg ? { collected: feeAgg._sum.amount ?? 0, payments: feeAgg._count } : null,
  };

  return <AdminDashboard data={data} />;
}
