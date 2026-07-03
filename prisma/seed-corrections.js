// Seeds one PENDING grade-correction request for the demo school (teacher asks
// to fix Divine's Biology sequence-2 mark), so /admin/corrections demos the
// approve/reject flow immediately. Idempotent. Run: node prisma/seed-corrections.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SCHOOL = "Demo Secondary School, Bamenda";

async function main() {
  const school = await prisma.school.findFirst({ where: { name: SCHOOL } });
  if (!school) return console.log("demo school not found");
  const teacher = await prisma.schoolMembership.findFirst({
    where: { schoolId: school.id, role: "TEACHER", status: "active" },
  });
  if (!teacher) return console.log("no teacher to attribute the request to");

  const subject = await prisma.subject.findFirst({ where: { schoolId: school.id, name: "Biology" } });
  const acct = await prisma.studentAccount.findUnique({ where: { loginCode: "DIVINE" } });
  if (!subject || !acct) return console.log("Biology subject or demo student missing");

  const grade = await prisma.grade.findFirst({
    where: { schoolId: school.id, studentId: acct.studentId, subjectId: subject.id, sequence: 2 },
  });
  if (!grade) return console.log("no Biology seq-2 grade for the demo student — run seed-grades first");

  const open = await prisma.gradeCorrection.findFirst({ where: { gradeId: grade.id, status: "PENDING" } });
  if (open) return console.log("pending correction already exists — nothing to do");

  const newScore = Math.min(20, Math.round((Number(grade.score) + 4.4) * 10) / 10);
  await prisma.gradeCorrection.create({
    data: {
      schoolId: school.id,
      gradeId: grade.id,
      oldScore: grade.score,
      newScore,
      requestedBy: teacher.userId,
    },
  });
  console.log(`  + Correction request: Biology seq 2, ${Number(grade.score)} -> ${newScore} (pending approval)`);
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
