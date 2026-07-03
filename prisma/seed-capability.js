// Backfills contactCapability for the demo school's parents with a realistic
// mix (~50% smartphone / 25% WhatsApp / 25% SMS-only, a few left unknown) so the
// admin "Parent reach" cost profile demos with real numbers. Only touches users
// whose capability is still null (idempotent). Run: node prisma/seed-capability.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SCHOOL = "Demo Secondary School, Bamenda";
const DEMO_PARENT_PHONE = "+237699000001";

async function main() {
  const school = await prisma.school.findFirst({ where: { name: SCHOOL } });
  if (!school) return console.log("demo school not found");

  const links = await prisma.parentLink.findMany({
    where: { schoolId: school.id, status: "active" },
    select: { parentUserId: true },
    distinct: ["parentUserId"],
  });
  const ids = links.map((l) => l.parentUserId);
  const parents = await prisma.user.findMany({
    where: { id: { in: ids }, contactCapability: null },
    orderBy: { phone: "asc" },
  });

  let updated = 0;
  for (let i = 0; i < parents.length; i++) {
    const p = parents[i];
    let cap;
    if (p.phone === DEMO_PARENT_PHONE) cap = "SMARTPHONE"; // she demos web push
    else if (i % 10 === 9) cap = null; // leave a few unknown (realistic)
    else if (i % 4 <= 1) cap = "SMARTPHONE";
    else if (i % 4 === 2) cap = "WHATSAPP";
    else cap = "SMS_ONLY";
    if (!cap) continue;
    await prisma.user.update({ where: { id: p.id }, data: { contactCapability: cap } });
    updated++;
  }

  const counts = await prisma.user.groupBy({
    by: ["contactCapability"],
    where: { id: { in: ids } },
    _count: true,
  });
  console.log(`Updated ${updated} parent(s). Mix:`);
  for (const c of counts) console.log(`  ${c.contactCapability ?? "unknown"}: ${c._count}`);
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
