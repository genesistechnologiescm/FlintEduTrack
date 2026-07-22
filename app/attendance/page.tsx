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

  // Which period is this teacher marking? Scoped to their OWN school and their
  // OWN slots — a slot from another school would leak that school's roster and
  // then be rejected by submitAttendance's authz anyway. Admins have no teaching
  // slots of their own, so they fall back to any period in their school.
  const jsDay = new Date().getDay(); // 0=Sun..6=Sat ; our scheme is Mon=1..Sat=6
  const mine = { schoolId: membership.schoolId, teacherUserId: user.id };
  const include = { subject: true, classGroup: true } as const;
  const nowHHMM = formatWat(new Date()).slice(0, 5); // WAT — the school's wall clock

  const slot =
    // The period running now (or the next one still to come today).
    (jsDay >= 1 && jsDay <= 6
      ? ((await prisma.timetableSlot.findFirst({
          where: { ...mine, dayOfWeek: jsDay, startTime: { lte: nowHHMM }, endTime: { gte: nowHHMM } },
          include,
        })) ??
        (await prisma.timetableSlot.findFirst({
          where: { ...mine, dayOfWeek: jsDay, startTime: { gte: nowHHMM } },
          orderBy: { startTime: "asc" },
          include,
        })) ??
        // Earlier today — still markable (a teacher catching up after the lesson).
        (await prisma.timetableSlot.findFirst({
          where: { ...mine, dayOfWeek: jsDay },
          orderBy: { startTime: "desc" },
          include,
        })))
      : null) ??
    // Off-timetable day, or an admin standing in: any period of THIS school.
    (await prisma.timetableSlot.findFirst({
      where: { ...mine, dayOfWeek: jsDay },
      include,
    })) ??
    (await prisma.timetableSlot.findFirst({
      where: { teacherUserId: user.id, schoolId: membership.schoolId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      include,
    })) ??
    (await prisma.timetableSlot.findFirst({
      where: { schoolId: membership.schoolId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      include,
    }));

  if (!slot) {
    // A brand-new school has no timetable yet. Say so plainly and point the
    // admin at the screen that fixes it, instead of a developer's seed note.
    const isAdmin = membership.role === "ADMIN";
    return (
      <div className="et-card mx-auto mt-10 max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold text-ink">No timetable yet</h1>
        <p className="mt-3 text-sm text-sub">
          {isAdmin
            ? "Attendance is marked against a timetable period. Build the school timetable to start marking registers."
            : "Attendance is marked against a timetable period. Ask your school administrator to add your teaching periods."}
        </p>
        {isAdmin && (
          <a href="/admin/timetable" className="et-btn mt-6 inline-flex">
            Build the timetable
          </a>
        )}
      </div>
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
