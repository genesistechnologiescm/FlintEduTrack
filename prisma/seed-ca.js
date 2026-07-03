// Seeds the demo school's assessment components: Continuous Assessment 40% +
// Sequence Exam 60% (sum 100 → component-wise grade entry activates).
// Idempotent by name. Run: node prisma/seed-ca.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});
async function main() {
  const school = await prisma.school.findFirst({ where: { name: "Demo Secondary School, Bamenda" } });
  if (!school) return console.log("demo school not found");
  const wanted = [
    { name: "Continuous Assessment", weight: 40, order: 1 },
    { name: "Sequence Exam", weight: 60, order: 2 },
  ];
  let created = 0;
  for (const c of wanted) {
    const existing = await prisma.assessmentComponent.findFirst({
      where: { schoolId: school.id, name: c.name, deletedAt: null },
    });
    if (existing) continue;
    await prisma.assessmentComponent.create({ data: { schoolId: school.id, ...c } });
    created++;
  }
  console.log(`Done. ${created} component(s) created (CA 40 + Exam 60 = 100%).`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
