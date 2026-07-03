// Seeds engagement: the demo student "opened" three lessons (yesterday + today
// rows where possible). Real account-based views — reach is honestly 1 because
// only one student account exists. Idempotent (upsert). Run: node prisma/seed-views.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});
async function main() {
  const acct = await prisma.studentAccount.findUnique({ where: { loginCode: "DIVINE" } });
  if (!acct) return console.log("demo student missing");
  const resources = await prisma.lessonResource.findMany({
    where: { schoolId: acct.schoolId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 3,
  });
  const days = [0, 1].map((back) => new Date(new Date(Date.now() - back * 86_400_000).toISOString().slice(0, 10)));
  let n = 0;
  for (const r of resources) {
    for (const day of days) {
      await prisma.resourceView.upsert({
        where: { resourceId_userId_day: { resourceId: r.id, userId: acct.id, day } },
        update: {},
        create: { resourceId: r.id, userId: acct.id, day },
      });
      n++;
    }
  }
  console.log(`Done. ${n} view rows ensured across ${resources.length} lessons (reach = 1 student, honestly).`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
