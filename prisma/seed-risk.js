// Gives two already-absence-prone demo students a recent consecutive-absence
// streak, so the Dropout-risk radar shows clear HIGH-risk cases (and closes the
// alert → radar → welfare loop for the demo child, Divine). Idempotent (upserts).
// Run: node --env-file=.env --env-file=.env.local prisma/seed-risk.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SCHOOL = "Demo Secondary School, Bamenda";
const TARGETS = [["Divine", "Tabi"], ["Blessing", "Ngwa"]];
const STREAK_DAYS = 5;

function recentWeekdays(n) {
  const out = [];
  const d = new Date();
  while (out.length < n) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() - 1);
  }
  return out; // most recent first
}

async function main() {
  const school = await prisma.school.findFirst({ where: { name: SCHOOL } });
  if (!school) return console.log("demo school not found");
  const dates = recentWeekdays(STREAK_DAYS);
  let marked = 0;

  for (const [firstName, lastName] of TARGETS) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { schoolId: school.id, status: "ACTIVE", student: { firstName, lastName } },
      include: { student: true },
    });
    if (!enrollment) { console.log(`  ! ${firstName} ${lastName} not found`); continue; }
    const slot = await prisma.timetableSlot.findFirst({ where: { schoolId: school.id, classGroupId: enrollment.classGroupId } });
    if (!slot) { console.log(`  ! no timetable slot for ${firstName}'s class`); continue; }

    for (const iso of dates) {
      const date = new Date(iso);
      const session = await prisma.attendanceSession.upsert({
        where: { timetableSlotId_date: { timetableSlotId: slot.id, date } },
        update: { submittedAt: new Date() },
        create: {
          schoolId: school.id,
          timetableSlotId: slot.id,
          classGroupId: enrollment.classGroupId,
          subjectId: slot.subjectId,
          teacherUserId: slot.teacherUserId,
          date,
          periodStartAt: new Date(`${iso}T07:30:00`),
          submittedAt: new Date(),
          idempotencyKey: `risk-${slot.id}-${iso}`,
        },
      });
      await prisma.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId: session.id, studentId: enrollment.studentId } },
        update: { status: "ABSENT" },
        create: { sessionId: session.id, studentId: enrollment.studentId, status: "ABSENT", setBy: "TEACHER", setByUserId: slot.teacherUserId },
      });
      marked++;
    }
    console.log(`  ✓ ${firstName} ${lastName}: ${dates.length} recent days marked absent`);
  }
  console.log(`Done. ${marked} absence marks added.`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e.message); await prisma.$disconnect(); process.exit(1); });
