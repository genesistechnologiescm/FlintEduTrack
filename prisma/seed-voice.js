// Voice-alert demo data: flags two demo-school parents as VOICE_ONLY (declared
// at enrolment: they cannot read SMS, so the router calls them in their
// preferred language) and logs one delivered VOICE alert for today so the
// admin home's alerts card + reach profile show the channel working.
// Idempotent per day. Run: npm run db:seed:voice
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SCHOOL = "Demo Secondary School, Bamenda";
const DEMO_PARENT_PHONE = "+237699000001"; // stays SMARTPHONE for the push demo

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function main() {
  const school = await prisma.school.findFirst({ where: { name: SCHOOL } });
  if (!school) return console.log("demo school not found — run the main seed first");

  const links = await prisma.parentLink.findMany({
    where: { schoolId: school.id, status: "active", parent: { phone: { not: DEMO_PARENT_PHONE } } },
    include: { parent: true },
    orderBy: { parent: { phone: "asc" } },
    take: 2,
  });
  if (links.length === 0) return console.log("no parent links — run the main seed first");

  for (const link of links) {
    await prisma.user.update({
      where: { id: link.parentUserId },
      data: { contactCapability: "VOICE_ONLY" },
    });
    console.log(`VOICE_ONLY: ${link.parent.displayName ?? link.parent.phone} (${link.parent.preferredLang})`);
  }

  // One delivered voice call in today's log (idempotent per parent per day).
  const first = links[0];
  const key = `voice-demo:${first.parentUserId}:${todayISO()}`;
  await prisma.notificationLog.upsert({
    where: { idempotencyKey: key },
    update: {},
    create: {
      parentUserId: first.parentUserId,
      studentId: first.studentId,
      eventType: "ABSENCE_FIRST_UNEXCUSED",
      criticality: "CRITICAL",
      channelAttempted: "VOICE",
      channelSucceeded: "VOICE",
      costFcfa: 25,
      idempotencyKey: key,
      deliveryStatus: "SENT",
      providerMsgId: `mock_voice_seed_${todayISO()}`,
    },
  });
  console.log(`logged 1 VOICE alert for today (25 FCFA, ${first.parent.preferredLang})`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
