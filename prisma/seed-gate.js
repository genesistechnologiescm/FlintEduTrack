// Seeds one gate check-in for today: the Bursar arrived at 07:41 WAT (late).
// The teacher is deliberately LEFT UNCHECKED so the live "I've arrived" tap can
// be demonstrated on stage. Idempotent. Run: node prisma/seed-gate.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SCHOOL = "Demo Secondary School, Bamenda";
const BURSAR_PHONE = "+237670000002";

function watTodayISO() {
  return new Date(Date.now() + 3600_000).toISOString().slice(0, 10);
}

async function main() {
  const school = await prisma.school.findFirst({ where: { name: SCHOOL } });
  const bursar = await prisma.user.findUnique({ where: { phone: BURSAR_PHONE } });
  if (!school || !bursar) return console.log("demo school/bursar missing");

  const date = new Date(watTodayISO());
  const existing = await prisma.gateCheckIn.findUnique({
    where: { userId_date: { userId: bursar.id, date } },
  });
  if (existing) return console.log("bursar already checked in today — nothing to do");

  // 07:41 WAT = 06:41 UTC today.
  const arrivedAt = new Date(`${watTodayISO()}T06:41:00.000Z`);
  await prisma.gateCheckIn.create({
    data: { schoolId: school.id, userId: bursar.id, date, arrivedAt },
  });
  console.log("  + Bursar checked in at 07:41 WAT (late). Teacher left unchecked for the live tap.");
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
