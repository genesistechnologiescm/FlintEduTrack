// Seeds one demo MCQ quiz for the demo class (Form 5 Science A, Mathematics) so
// the student dashboard shows a takeable quiz. Idempotent (skips by title).
// Run: node --env-file=.env --env-file=.env.local prisma/seed-quiz.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SCHOOL = "Demo Secondary School, Bamenda";
const SUBJECT = "Mathematics";
const TITLE = "Algebra — quick check";
const QUESTIONS = [
  { prompt: "Solve: x + 5 = 12", options: ["5", "7", "17", "60"], correctIndex: 1 },
  { prompt: "Factorise: x² − 9", options: ["(x−3)(x+3)", "(x−9)(x+1)", "(x−3)²", "x(x−9)"], correctIndex: 0 },
  { prompt: "If 2x = 10, then x =", options: ["2", "8", "5", "20"], correctIndex: 2 },
];

async function main() {
  const school = await prisma.school.findFirst({ where: { name: SCHOOL } });
  if (!school) return console.log("demo school not found");
  const subject = await prisma.subject.findFirst({ where: { schoolId: school.id, name: SUBJECT } });
  const klass = await prisma.classGroup.findFirst({ where: { schoolId: school.id, deletedAt: null }, orderBy: { name: "asc" } });
  const staff = await prisma.schoolMembership.findFirst({ where: { schoolId: school.id, role: "TEACHER", status: "active" } });
  if (!subject) return console.log("Mathematics subject not found — run the base seed first");

  const existing = await prisma.quiz.findFirst({ where: { schoolId: school.id, title: TITLE, deletedAt: null } });
  if (existing) {
    console.log("demo quiz already exists — nothing to do");
    return prisma.$disconnect();
  }

  await prisma.quiz.create({
    data: {
      schoolId: school.id,
      subjectId: subject.id,
      classGroupId: klass?.id ?? null,
      title: TITLE,
      createdBy: staff?.userId ?? "system",
      questions: { create: QUESTIONS.map((q, i) => ({ order: i + 1, prompt: q.prompt, options: q.options, correctIndex: q.correctIndex })) },
    },
  });
  console.log(`  ✓ Quiz "${TITLE}" (${QUESTIONS.length} questions) for ${klass ? klass.name : "all classes"}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e.message);
  await prisma.$disconnect();
  process.exit(1);
});
