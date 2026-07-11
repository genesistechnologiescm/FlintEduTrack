// Spreads the demo school's most recent payments across the CURRENT month so
// the admin home's "fees collected this month" stat shows a realistic number
// (the original fee seed dated everything at seed time, which goes stale).
// Balance-neutral (only re-dates existing payments, never changes amounts) and
// safe to re-run. Run: node prisma/seed-fees-month.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SCHOOL = "Demo Secondary School, Bamenda";
const SPREAD = 8; // how many payments to pull into this month

async function main() {
  const school = await prisma.school.findFirst({ where: { name: SCHOOL } });
  if (!school) return console.log("demo school not found — run the main seed first");

  const payments = await prisma.payment.findMany({
    where: { schoolId: school.id },
    orderBy: { createdAt: "desc" },
    take: SPREAD,
  });
  if (payments.length === 0) return console.log("no payments — run db:seed:fees first");

  const now = new Date();
  const daysIntoMonth = Math.max(now.getDate() - 1, 1);
  for (let i = 0; i < payments.length; i++) {
    // Spread across the days elapsed this month, most recent first.
    const day = 1 + Math.floor((i / payments.length) * daysIntoMonth);
    const when = new Date(now.getFullYear(), now.getMonth(), day, 9 + (i % 8), 15 * (i % 4));
    await prisma.payment.update({ where: { id: payments[i].id }, data: { createdAt: when } });
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const agg = await prisma.payment.aggregate({
    _sum: { amount: true },
    _count: true,
    where: { schoolId: school.id, createdAt: { gte: monthStart } },
  });
  console.log(`this month: ${agg._count} payments · ${agg._sum.amount ?? 0} FCFA`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
