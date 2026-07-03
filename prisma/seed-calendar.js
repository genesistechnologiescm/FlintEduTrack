// Seeds three upcoming calendar events for the demo school so the calendar,
// parent dashboard and student dashboard demo with content. Idempotent by
// (school, title). Run: node prisma/seed-calendar.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SCHOOL = "Demo Secondary School, Bamenda";

function inDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return new Date(d.toISOString().slice(0, 10));
}

async function main() {
  const school = await prisma.school.findFirst({ where: { name: SCHOOL } });
  if (!school) return console.log("demo school not found");
  const admin = await prisma.schoolMembership.findFirst({
    where: { schoolId: school.id, role: "ADMIN", status: "active" },
  });
  if (!admin) return console.log("no admin to attribute events to");

  const EVENTS = [
    { title: "Second Sequence examinations", startDate: inDays(5), endDate: inDays(9), note: "All classes. Revision timetable on the notice board." },
    { title: "Parent–Teacher meeting", startDate: inDays(12), endDate: null, note: "School hall, 9:00 AM." },
    { title: "Mid-term break", startDate: inDays(20), endDate: inDays(24), note: "Classes resume the following Monday." },
  ];

  let created = 0;
  for (const e of EVENTS) {
    const existing = await prisma.calendarEvent.findFirst({
      where: { schoolId: school.id, title: e.title, deletedAt: null },
    });
    if (existing) continue;
    await prisma.calendarEvent.create({
      data: { schoolId: school.id, createdBy: admin.userId, ...e },
    });
    created++;
  }
  console.log(`Done. ${created} event(s) created for ${SCHOOL}.`);
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
