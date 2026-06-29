// Seeds a couple of school announcements (+ per-parent receipts) for the demo
// schools, so the admin "sent" list and the parent announcement feed have
// content before any live demo post. Idempotent: skips by (school, title).
// Run: node prisma/seed-announcements.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SCHOOL_NAMES = ["Demo Secondary School, Bamenda", "Collège Libermann"];

const ANNOUNCEMENTS = [
  {
    title: "Third Term resumes Monday",
    body: "Dear parents, the third term resumes on Monday. Please ensure all students arrive by 7:30 AM with complete uniform and materials. The new timetable is posted on the notice board.",
  },
  {
    title: "Parent–Teacher meeting this Saturday",
    body: "We invite all parents to the Parent–Teacher meeting this Saturday at 9:00 AM in the school hall. Class teachers will share term progress and discuss each child individually.",
  },
];

async function main() {
  let created = 0;
  for (const name of SCHOOL_NAMES) {
    const school = await prisma.school.findFirst({ where: { name } });
    if (!school) continue;
    const admin = await prisma.schoolMembership.findFirst({ where: { schoolId: school.id, role: "ADMIN", status: "active" } });
    if (!admin) continue;

    // Whole-school recipients: every active parent in this school.
    const links = await prisma.parentLink.findMany({
      where: { schoolId: school.id, status: "active" },
      select: { parentUserId: true },
      distinct: ["parentUserId"],
    });
    const parentIds = links.map((l) => l.parentUserId);

    for (const a of ANNOUNCEMENTS) {
      const existing = await prisma.announcement.findFirst({ where: { schoolId: school.id, title: a.title } });
      if (existing) continue;
      const announcement = await prisma.announcement.create({
        data: { schoolId: school.id, authorUserId: admin.userId, audience: "SCHOOL", title: a.title, body: a.body },
      });
      if (parentIds.length > 0) {
        await prisma.announcementReceipt.createMany({
          data: parentIds.map((parentUserId) => ({ announcementId: announcement.id, parentUserId })),
          skipDuplicates: true,
        });
      }
      created++;
      console.log(`  + ${name}: "${a.title}" → ${parentIds.length} parents`);
    }
  }
  console.log(`Done. ${created} announcement(s) created.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
