import { prisma } from "@/lib/prisma";
import { AttendanceMarker } from "@/components/AttendanceMarker";

export const dynamic = "force-dynamic";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default async function AttendancePage() {
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

  return (
    <AttendanceMarker
      slotId={slot.id}
      dateISO={todayISO()}
      className={slot.classGroup.name}
      subjectName={slot.subject.name}
      periodLabel={`${slot.startTime}–${slot.endTime}`}
      students={students}
    />
  );
}
