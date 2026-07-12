// Seeds the national noticeboard: two PUBLISHED ministry circulars (so the
// public board has content) and one PENDING_REVIEW notice (so the Flint
// approval flow can be demonstrated live). Idempotent by title.
// Run: npm run db:seed:noticeboard
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const NOTICES = [
  {
    title: "Circular: 2026/2027 School Year Resumption",
    body: "All secondary schools resume Monday 7 September 2026. Heads of institutions must complete staff postings and class lists in the first week. Regional delegations will confirm readiness by 15 September.",
    status: "PUBLISHED",
  },
  {
    title: "National Youth Day: School Programmes",
    body: "Schools should prepare marching contingents and cultural displays for 11 February celebrations. Programmes must be submitted to divisional delegations by 20 January.",
    status: "PUBLISHED",
  },
  {
    title: "Term 1 Regional Inspection Schedule",
    body: "Pedagogic inspectors will visit selected schools in the North-West and South-West between 5 and 23 October 2026. Schools will be notified one week ahead. Attendance registers and lesson notes should be available.",
    status: "PENDING_REVIEW",
  },
];

async function main() {
  const gov = await prisma.user.findFirst({ where: { isGovernment: true } });
  const flint = await prisma.user.findFirst({ where: { isFlintAdmin: true } });
  if (!gov) return console.log("no government user — run db:seed:government first");

  let added = 0;
  for (const n of NOTICES) {
    const existing = await prisma.announcement.findFirst({
      where: { audience: "NATIONAL", title: n.title, deletedAt: null },
    });
    if (existing) continue;
    await prisma.announcement.create({
      data: {
        schoolId: null,
        authorUserId: gov.id,
        audience: "NATIONAL",
        status: n.status,
        title: n.title,
        body: n.body,
        reviewedBy: n.status === "PUBLISHED" ? (flint?.id ?? null) : null,
        reviewedAt: n.status === "PUBLISHED" ? new Date() : null,
      },
    });
    added++;
  }
  const counts = await prisma.announcement.groupBy({
    by: ["status"],
    where: { audience: "NATIONAL", deletedAt: null },
    _count: true,
  });
  console.log(`national notices: +${added} added ·`, counts.map((c) => `${c.status}=${c._count}`).join(" "));
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
