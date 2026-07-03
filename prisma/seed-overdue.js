// Backfills a due date one week in the past on the demo school's fee items so
// the overdue desk + parent badges demo immediately. Idempotent (only sets
// items whose dueDate is null). Run: node prisma/seed-overdue.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});
async function main() {
  const school = await prisma.school.findFirst({ where: { name: "Demo Secondary School, Bamenda" } });
  if (!school) return console.log("demo school not found");
  const due = new Date(new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10));
  const res = await prisma.feeItem.updateMany({
    where: { schoolId: school.id, deletedAt: null, dueDate: null },
    data: { dueDate: due },
  });
  console.log(`Done. ${res.count} fee item(s) given due date ${due.toISOString().slice(0, 10)}.`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
