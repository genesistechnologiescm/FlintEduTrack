// Seeds a few lesson resources (LINK + NOTE) for the demo school's class, so the
// e-learning views have content and the parent of the demo child sees lessons.
// Idempotent: skips by (school, subject, title). Run: node prisma/seed-resources.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SCHOOL = "Demo Secondary School, Bamenda";

// subject name -> resources
const RES = {
  Mathematics: [
    { type: "LINK", title: "Quadratic equations — full lesson", url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:quadratic-functions-equations" },
    { type: "NOTE", title: "Homework: solving by factorisation", body: "Solve by factorisation:\n1) x^2 - 5x + 6 = 0\n2) x^2 + 2x - 8 = 0\n3) 2x^2 - 7x + 3 = 0\nShow all working. Bring your answers to the next class." },
  ],
  Physics: [
    { type: "NOTE", title: "Newton's three laws of motion", body: "1) An object stays at rest or in uniform motion unless acted on by a net force.\n2) F = ma — force equals mass times acceleration.\n3) Every action has an equal and opposite reaction.\nRead these and write one real-life example of each." },
  ],
  Chemistry: [
    { type: "LINK", title: "The periodic table explained", url: "https://www.youtube.com/watch?v=0RRVV4Diomg" },
  ],
  Biology: [
    { type: "NOTE", title: "Photosynthesis — key points", body: "Photosynthesis happens in the chloroplast.\n6CO2 + 6H2O --(light)--> C6H12O6 + 6O2\nInputs: carbon dioxide, water, light energy.\nOutputs: glucose and oxygen.\nLearn the equation for the sequence test." },
  ],
  "English Language": [
    { type: "LINK", title: "Improve your English — BBC Learning", url: "https://www.bbc.co.uk/learningenglish/" },
  ],
};

async function main() {
  const school = await prisma.school.findFirst({ where: { name: SCHOOL } });
  if (!school) return console.log("demo school not found");
  const teacher = await prisma.schoolMembership.findFirst({ where: { schoolId: school.id, role: "TEACHER", status: "active" } });
  const admin = await prisma.schoolMembership.findFirst({ where: { schoolId: school.id, role: "ADMIN", status: "active" } });
  const createdBy = (teacher ?? admin)?.userId;
  if (!createdBy) return console.log("no staff to attribute resources to");
  const klass = await prisma.classGroup.findFirst({ where: { schoolId: school.id, deletedAt: null }, orderBy: { name: "asc" } });

  let created = 0;
  for (const [subjectName, items] of Object.entries(RES)) {
    const subject = await prisma.subject.findFirst({ where: { schoolId: school.id, name: subjectName } });
    if (!subject) continue;
    for (const it of items) {
      const existing = await prisma.lessonResource.findFirst({ where: { schoolId: school.id, subjectId: subject.id, title: it.title, deletedAt: null } });
      if (existing) continue;
      await prisma.lessonResource.create({
        data: {
          schoolId: school.id,
          subjectId: subject.id,
          classGroupId: klass?.id ?? null,
          type: it.type,
          title: it.title,
          url: it.type === "LINK" ? it.url : null,
          body: it.type === "NOTE" ? it.body : null,
          createdBy,
        },
      });
      created++;
    }
  }
  console.log(`Done. ${created} resource(s) created for ${SCHOOL}${klass ? ` (${klass.name})` : ""}.`);
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
