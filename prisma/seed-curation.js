// Sets up the library contribution demo: flags the demo school admin as a
// Flint curator (isFlintAdmin) and queues one PENDING teacher submission so
// /curate demos the approve/reject flow. Idempotent. Run: node prisma/seed-curation.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const CURATOR_PHONE = "+237670000000"; // demo admin doubles as Flint curator
const SCHOOL = "Demo Secondary School, Bamenda";
const TITLE = "Equations of motion — the four kinematic formulas";

async function main() {
  const curator = await prisma.user.findUnique({ where: { phone: CURATOR_PHONE } });
  if (!curator) return console.log("demo admin not found");
  if (!curator.isFlintAdmin) {
    await prisma.user.update({ where: { id: curator.id }, data: { isFlintAdmin: true } });
    console.log("  ✓ demo admin flagged as Flint curator");
  }

  const school = await prisma.school.findFirst({ where: { name: SCHOOL } });
  const teacher = await prisma.schoolMembership.findFirst({
    where: { schoolId: school?.id, role: "TEACHER", status: "active" },
  });
  if (!school || !teacher) return console.log("demo school/teacher missing");

  const existing = await prisma.libraryItem.findFirst({ where: { title: TITLE, deletedAt: null } });
  if (existing) return console.log("submission already exists — nothing to do");

  await prisma.libraryItem.create({
    data: {
      kind: "STUDY_GUIDE",
      title: TITLE,
      subject: "Physics",
      exam: "GCE O Level",
      body: [
        "For motion with constant acceleration, four formulas answer every question:",
        "1. v = u + at            (no displacement s)",
        "2. s = ut + ½at²         (no final velocity v)",
        "3. v² = u² + 2as         (no time t)",
        "4. s = ½(u + v)t         (no acceleration a)",
        "",
        "Method: list the quantities the question GIVES you and the one it WANTS,",
        "then pick the one formula that omits the quantity you neither have nor need.",
        "Always write the formula before substituting — method marks are real marks.",
      ].join("\n"),
      status: "PENDING",
      schoolId: school.id,
      createdBy: teacher.userId,
    },
  });
  console.log(`  + PENDING submission queued: "${TITLE}" (by the demo teacher)`);
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
