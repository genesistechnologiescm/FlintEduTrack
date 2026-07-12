// Seeds the national exam calendar with realistic Cameroon dates (GCE Board /
// MINESEC style) so the government manager, parent and student calendars show
// the national layer working. Idempotent by title. Run: npm run db:seed:national-exams
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const EVENTS = [
  { title: "GCE O-Level Results Release", start: "2026-08-12", note: "Cameroon GCE Board" },
  { title: "GCE A-Level Results Release", start: "2026-08-19", note: "Cameroon GCE Board" },
  { title: "GCE 2027 Registration Deadline", start: "2026-12-15", note: "Late fees apply after this date" },
  { title: "BEPC 2027 Registration Deadline", start: "2026-12-20", note: "MINESEC" },
  { title: "Mock GCE Week", start: "2027-02-15", end: "2027-02-19", note: "All examination classes" },
  { title: "GCE Written Papers Begin", start: "2027-05-24", note: "O and A Level" },
];

async function main() {
  const gov = await prisma.user.findFirst({ where: { isGovernment: true } });
  const createdBy = gov?.id ?? "system";

  let added = 0;
  for (const e of EVENTS) {
    const existing = await prisma.nationalEvent.findFirst({ where: { title: e.title, deletedAt: null } });
    if (existing) continue;
    await prisma.nationalEvent.create({
      data: {
        title: e.title,
        startDate: new Date(e.start),
        endDate: e.end ? new Date(e.end) : null,
        note: e.note ?? null,
        createdBy,
      },
    });
    added++;
  }
  const total = await prisma.nationalEvent.count({ where: { deletedAt: null } });
  console.log(`national events: +${added} added, ${total} total`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
