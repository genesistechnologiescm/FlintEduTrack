// Queues digest-pending absence rows (today) for three demo-school parents so
// the 17:00 digest flush (/api/digest) is demonstrable: hit the endpoint and
// watch 3 queued rows become 1-SMS-per-parent summaries. Idempotent via the
// (parent, student, day) idempotency key. Run: node prisma/seed-digest.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SCHOOL = "Demo Secondary School, Bamenda";
const DEMO_PARENT_PHONE = "+237699000001";

async function main() {
  const school = await prisma.school.findFirst({ where: { name: SCHOOL } });
  if (!school) return console.log("demo school not found");
  const today = new Date().toISOString().slice(0, 10);

  // Demo parent first, then two more.
  const demoParent = await prisma.user.findUnique({ where: { phone: DEMO_PARENT_PHONE } });
  const links = await prisma.parentLink.findMany({
    where: { schoolId: school.id, status: "active" },
    distinct: ["parentUserId"],
    take: 10,
  });
  const ordered = [
    ...links.filter((l) => demoParent && l.parentUserId === demoParent.id),
    ...links.filter((l) => !demoParent || l.parentUserId !== demoParent.id),
  ].slice(0, 3);

  let queued = 0;
  for (const link of ordered) {
    const idempotencyKey = `${link.parentUserId}:${link.studentId}:${today}:absence`;
    const existing = await prisma.notificationLog.findUnique({ where: { idempotencyKey } });
    if (existing) continue;
    await prisma.notificationLog.create({
      data: {
        parentUserId: link.parentUserId,
        studentId: link.studentId,
        eventType: "ABSENCE_DIGEST",
        criticality: "ROUTINE",
        channelAttempted: "SMS",
        costFcfa: 0,
        idempotencyKey,
        deliveryStatus: "QUEUED",
      },
    });
    queued++;
  }
  console.log(`Queued ${queued} digest-pending absence(s) for today (${today}).`);
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
