// Seeds one active handover note from the demo teacher on the demo class
// (until +3 days), so the attendance screen shows the substitute briefing.
// Idempotent by (class, author, activeUntil>=today). Run: node prisma/seed-handover.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});
const SCHOOL = "Demo Secondary School, Bamenda";
async function main() {
  const school = await prisma.school.findFirst({ where: { name: SCHOOL } });
  const teacher = await prisma.schoolMembership.findFirst({ where: { schoolId: school?.id, role: "TEACHER", status: "active" } });
  const klass = await prisma.classGroup.findFirst({ where: { schoolId: school?.id, deletedAt: null }, orderBy: { name: "asc" } });
  if (!school || !teacher || !klass) return console.log("demo school/teacher/class missing");

  const today = new Date(new Date().toISOString().slice(0, 10));
  const existing = await prisma.handoverNote.findFirst({
    where: { classGroupId: klass.id, authorUserId: teacher.userId, deletedAt: null, activeUntil: { gte: today } },
  });
  if (existing) return console.log("active handover note already exists — nothing to do");

  const until = new Date(new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10));
  await prisma.handoverNote.create({
    data: {
      schoolId: school.id,
      classGroupId: klass.id,
      authorUserId: teacher.userId,
      activeUntil: until,
      body: [
        "Covering my medical absence, Mon–Wed.",
        "Maths: we finished Quadratics 4A — please take exercise 4B (questions 1–8) and collect Friday's homework.",
        "Divine Tabi has catch-up work in the tray; please hand it to him.",
        "Attendance as normal before first period.",
      ].join("\n"),
    },
  });
  console.log(`  + Handover note left on ${klass.name} until ${until.toISOString().slice(0, 10)}.`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
