// Seeds this week's wellbeing snapshots for the demo class: most ENGAGED, a
// couple NEUTRAL, and Divine = NEEDS_ATTENTION (his risk-radar + welfare story,
// now confirmed by a human read). Idempotent (upsert). Run: node prisma/seed-wellbeing.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SCHOOL = "Demo Secondary School, Bamenda";

function weekStartISO() {
  const wat = new Date(Date.now() + 3600_000);
  const back = (wat.getUTCDay() + 6) % 7;
  wat.setUTCDate(wat.getUTCDate() - back);
  return wat.toISOString().slice(0, 10);
}

async function main() {
  const school = await prisma.school.findFirst({ where: { name: SCHOOL } });
  const teacher = await prisma.schoolMembership.findFirst({
    where: { schoolId: school?.id, role: "TEACHER", status: "active" },
  });
  if (!school || !teacher) return console.log("demo school/teacher missing");

  const divineAcct = await prisma.studentAccount.findUnique({ where: { loginCode: "DIVINE" } });
  const klass = await prisma.classGroup.findFirst({ where: { schoolId: school.id, deletedAt: null }, orderBy: { name: "asc" } });
  const enrollments = await prisma.enrollment.findMany({
    where: { schoolId: school.id, classGroupId: klass?.id, status: "ACTIVE" },
    orderBy: { enrolledAt: "asc" },
  });

  const weekStart = new Date(weekStartISO());
  let n = 0;
  for (let i = 0; i < enrollments.length; i++) {
    const e = enrollments[i];
    let level = "ENGAGED";
    if (divineAcct && e.studentId === divineAcct.studentId) level = "NEEDS_ATTENTION";
    else if (i % 6 === 4) level = "NEUTRAL";
    await prisma.wellbeingSnapshot.upsert({
      where: { studentId_weekStart: { studentId: e.studentId, weekStart } },
      update: {}, // don't overwrite a live demo tap
      create: { schoolId: school.id, studentId: e.studentId, weekStart, level, setByUserId: teacher.userId },
    });
    n++;
  }
  console.log(`Done. ${n} snapshot(s) ensured for week of ${weekStartISO()} (Divine = NEEDS_ATTENTION).`);
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
