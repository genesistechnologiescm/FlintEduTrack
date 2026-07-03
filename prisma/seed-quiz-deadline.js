// Quiz deadlines demo data: gives existing open quizzes a +5-day deadline and
// creates one PAST-DUE quiz so the student list demonstrably shows "Closed"
// (and the server rejects late submissions). Idempotent. Run: node prisma/seed-quiz-deadline.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SCHOOL = "Demo Secondary School, Bamenda";
const CLOSED_TITLE = "First Sequence revision drill";

function watEndOfDay(daysFromNow) {
  const d = new Date(Date.now() + daysFromNow * 86_400_000);
  return new Date(`${d.toISOString().slice(0, 10)}T22:59:59.000Z`); // 23:59 WAT
}

async function main() {
  const school = await prisma.school.findFirst({ where: { name: SCHOOL } });
  const teacher = await prisma.schoolMembership.findFirst({
    where: { schoolId: school?.id, role: "TEACHER", status: "active" },
  });
  const subject = await prisma.subject.findFirst({ where: { schoolId: school?.id, name: "Mathematics" } });
  if (!school || !teacher || !subject) return console.log("demo school/teacher/subject missing");

  // 1. Open quizzes get a future deadline (only where none is set).
  const upd = await prisma.quiz.updateMany({
    where: { schoolId: school.id, deletedAt: null, dueAt: null },
    data: { dueAt: watEndOfDay(5) },
  });

  // 2. One past-due quiz (deadline = yesterday) to demo the Closed state.
  const existing = await prisma.quiz.findFirst({ where: { schoolId: school.id, title: CLOSED_TITLE, deletedAt: null } });
  if (!existing) {
    await prisma.quiz.create({
      data: {
        schoolId: school.id,
        subjectId: subject.id,
        classGroupId: null,
        title: CLOSED_TITLE,
        dueAt: watEndOfDay(-1),
        createdBy: teacher.userId,
        questions: {
          create: [
            {
              order: 1,
              prompt: "Simplify: 3x + 2x",
              options: ["5x", "6x", "5x²", "x"],
              correctIndex: 0,
            },
          ],
        },
      },
    });
  }
  console.log(`Done. ${upd.count} quiz(zes) deadlined +5d; past-due "${CLOSED_TITLE}" ensured.`);
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
