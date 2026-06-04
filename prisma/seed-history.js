// Additive: generates ~2 weeks of past attendance so the welfare at-risk list is
// meaningful. Does NOT wipe — upserts by slot+date. Re-runnable.
// Run: node prisma/seed-history.js

const { PrismaClient } = require("@prisma/client");
// Scripts use the direct (session) connection, not the transaction pooler.
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

(async () => {
  const school = await prisma.school.findFirst();
  if (!school) throw new Error("No school — run seed.js first");

  const slots = await prisma.timetableSlot.findMany({ where: { schoolId: school.id } });
  const enrollments = await prisma.enrollment.findMany({
    where: { schoolId: school.id, status: "ACTIVE" },
    include: { student: true },
    orderBy: { enrolledAt: "asc" },
  });
  const studentIds = enrollments.map((e) => e.studentId);

  // Target students get a deliberate run of unexcused absences (oldest days first).
  const targets = [
    [studentIds[0], 6],
    [studentIds[1], 4],
    [studentIds[2], 3],
    [studentIds[3], 2],
  ];

  const today = new Date();
  const days = [];
  for (let i = 14; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const js = d.getDay();
    if (js >= 1 && js <= 6) days.push(d); // Mon..Sat
  }

  // Only days that actually have a scheduled period become sessions. Index by
  // real session order so absence counts match the targets exactly.
  const sessionDays = days
    .map((d) => ({ d, slot: slots.find((s) => s.dayOfWeek === d.getDay()) }))
    .filter((x) => x.slot);

  let sessions = 0;
  let records = 0;

  for (let di = 0; di < sessionDays.length; di++) {
    const { d, slot } = sessionDays[di];

    const dateISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dateVal = new Date(`${dateISO}T00:00:00.000Z`);
    const [h, m] = slot.startTime.split(":").map(Number);
    const periodStartAt = new Date(`${dateISO}T00:00:00.000Z`);
    periodStartAt.setUTCHours(h, m, 0, 0);
    const idempotencyKey = `${slot.id}:${dateISO}`;

    const session = await prisma.attendanceSession.upsert({
      where: { idempotencyKey },
      update: { submittedAt: periodStartAt },
      create: {
        schoolId: school.id,
        timetableSlotId: slot.id,
        classGroupId: slot.classGroupId,
        subjectId: slot.subjectId,
        teacherUserId: slot.teacherUserId,
        date: dateVal,
        periodStartAt,
        submittedAt: periodStartAt,
        isLate: false,
        idempotencyKey,
      },
    });
    sessions++;

    const absentToday = new Set();
    for (const [sid, count] of targets) if (di < count) absentToday.add(sid);

    await prisma.$transaction(
      studentIds.map((sid) =>
        prisma.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId: session.id, studentId: sid } },
          update: { status: absentToday.has(sid) ? "ABSENT" : "PRESENT" },
          create: {
            sessionId: session.id,
            studentId: sid,
            status: absentToday.has(sid) ? "ABSENT" : "PRESENT",
            setBy: "TEACHER",
            setByUserId: slot.teacherUserId,
          },
        }),
      ),
    );
    records += studentIds.length;
  }

  console.log("  ✓ History generated:", sessions, "sessions,", records, "records");
  console.log("  At-risk seeded:",
    enrollments[0].student.lastName, "(6)",
    enrollments[1].student.lastName, "(4)",
    enrollments[2].student.lastName, "(3)",
    enrollments[3].student.lastName, "(2)");
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
