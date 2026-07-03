// Scopes the demo staff: the Bursar becomes a FINANCE-scoped admin (fees only).
// The Principal stays FULL. Idempotent. Run: node prisma/seed-scopes.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});
async function main() {
  const bursar = await prisma.user.findUnique({ where: { phone: "+237670000002" } });
  if (!bursar) return console.log("bursar not found");
  const m = await prisma.schoolMembership.findFirst({
    where: { userId: bursar.id, role: "ADMIN", status: "active" },
  });
  if (!m) return console.log("bursar has no admin membership");
  if (m.adminScope === "FINANCE") return console.log("bursar already FINANCE-scoped — nothing to do");
  await prisma.schoolMembership.update({ where: { id: m.id }, data: { adminScope: "FINANCE" } });
  console.log("  ✓ Bursar scoped to FINANCE (fees only). Principal remains FULL.");
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
