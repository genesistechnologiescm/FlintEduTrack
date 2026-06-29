// Seeds grades (score /20, 2 sequences) for the demo school's class + Collège
// Libermann, so report cards + the parent grade view have data. Idempotent (skipDuplicates).
// Run: node prisma/seed-grades.js

const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SCHOOL_NAMES = ["Demo Secondary School, Bamenda", "Collège Libermann"];
const rndScore = () => Math.round((8 + Math.random() * 10) * 10) / 10; // 8.0–18.0

async function main() {
  let total = 0;
  for (const name of SCHOOL_NAMES) {
    const school = await prisma.school.findFirst({ where: { name } });
    if (!school) continue;
    const year = await prisma.academicYear.findFirst({ where: { schoolId: school.id, isCurrent: true } });
    const term = year ? await prisma.term.findFirst({ where: { academicYearId: year.id }, orderBy: { order: "asc" } }) : null;
    if (!term) continue;
    const subjects = await prisma.subject.findMany({ where: { schoolId: school.id } });
    const enrollments = await prisma.enrollment.findMany({ where: { schoolId: school.id, status: "ACTIVE" }, select: { studentId: true } });
    const teacher = await prisma.schoolMembership.findFirst({ where: { schoolId: school.id, role: "TEACHER" } });
    const enteredBy = teacher?.userId ?? "system";

    const grades = [];
    for (const { studentId } of enrollments) {
      for (const subject of subjects) {
        for (const sequence of [1, 2]) {
          grades.push({
            id: randomUUID(), studentId, subjectId: subject.id, schoolId: school.id,
            termId: term.id, sequence, score: rndScore(), enteredBy,
          });
        }
      }
    }
    const res = await prisma.grade.createMany({ data: grades, skipDuplicates: true });
    total += res.count;
    console.log(`  ✓ ${name}: ${res.count} grades (${subjects.length} subjects × 2 sequences × ${enrollments.length} students)`);
  }
  console.log(`\n  Done: ${total} grades seeded.`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e.message); await prisma.$disconnect(); process.exit(1); });
