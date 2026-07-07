import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { AttendanceMarker } from "@/components/AttendanceMarker";
import { formatWat, isOnTime, watTodayISO } from "@/lib/gate";

export const dynamic = "force-dynamic";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default async function AttendancePage() {
  // Authorization: attendance is a staff screen (teacher or admin of a school).
  // Parents / students / government have no school membership → blocked.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const membership = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, status: "active" },
  });
  if (!membership) redirect("/login");

  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { displayName: true } });

  // Pick today's period if the timetable has one; otherwise fall back to any slot
  // so the demo always shows something.
  const jsDay = new Date().getDay(); // 0=Sun..6=Sat ; our scheme is Mon=1..Sat=6
  const slot =
    (jsDay >= 1 && jsDay <= 6
      ? await prisma.timetableSlot.findFirst({
          where: { dayOfWeek: jsDay },
          include: { subject: true, classGroup: true },
        })
      : null) ??
    (await prisma.timetableSlot.findFirst({
      include: { subject: true, classGroup: true },
    }));

  if (!slot) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <p className="text-muted">No timetable found. Run the seed script first.</p>
      </main>
    );
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { classGroupId: slot.classGroupId, status: "ACTIVE" },
    include: { student: true },
  });

  const students = enrollments
    .map((e) => ({
      id: e.student.id,
      firstName: e.student.firstName,
      lastName: e.student.lastName,
    }))
    .sort((a, b) => a.lastName.localeCompare(b.lastName));

  // Gate check-in state for the signed-in staff member (banner above the roster).
  let gate: { time: string; onTime: boolean } | null = null;
  const record = await prisma.gateCheckIn.findUnique({
    where: { userId_date: { userId: user.id, date: new Date(watTodayISO()) } },
  });
  if (record) gate = { time: formatWat(record.arrivedAt), onTime: isOnTime(record.arrivedAt) };

  // Active handover notes for this class — the substitute's briefing.
  const handoverRows = await prisma.handoverNote.findMany({
    where: {
      classGroupId: slot.classGroupId,
      deletedAt: null,
      activeUntil: { gte: new Date(watTodayISO()) },
    },
    orderBy: { activeUntil: "asc" },
    include: { author: { select: { displayName: true } } },
  });
  const handoverNotes = handoverRows.map((n) => ({
    body: n.body,
    until: n.activeUntil.toISOString().slice(0, 10),
    author: n.author.displayName,
  }));

  return (
    <AttendanceMarker
      slotId={slot.id}
      dateISO={todayISO()}
      className={slot.classGroup.name}
      subjectName={slot.subject.name}
      periodLabel={`${slot.startTime}–${slot.endTime}`}
      students={students}
      teacherName={me?.displayName ?? "Teacher"}
      gate={gate}
      handover={handoverNotes}
    />
  );
}
