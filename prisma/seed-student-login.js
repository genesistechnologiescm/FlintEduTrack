// Gives the demo child (the demo parent's Bamenda child) a student login so the
// /student dashboard can be shown: code DIVINE / PIN 12345. Idempotent.
// Run: node --env-file=.env --env-file=.env.local prisma/seed-student-login.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_PIN = "12345";
const CODE = "DIVINE";
const DEMO_PARENT_PHONE = "+237699000001";

const authHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
const studentEmail = (code) => `s${code.toLowerCase().replace(/[^a-z0-9]/g, "")}@edutrack.local`;

async function provisionAuth(email, displayName) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ email, password: DEMO_PIN, email_confirm: true, user_metadata: { displayName, role: "student" } }),
  });
  if (res.ok) return (await res.json()).id;
  const list = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, { headers: authHeaders });
  const found = (await list.json()).users.find((u) => u.email === email);
  if (!found) throw new Error(`provisionAuth failed: HTTP ${res.status}`);
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${found.id}`, { method: "PUT", headers: authHeaders, body: JSON.stringify({ password: DEMO_PIN }) });
  return found.id;
}

async function main() {
  const school = await prisma.school.findFirst({ where: { name: "Demo Secondary School, Bamenda" } });
  const parent = await prisma.user.findUnique({ where: { phone: DEMO_PARENT_PHONE } });
  if (!school || !parent) return console.log("run the base + parent seeds first");
  const link = await prisma.parentLink.findFirst({
    where: { parentUserId: parent.id, schoolId: school.id, status: "active" },
    include: { student: true },
  });
  if (!link) return console.log("demo child not found");

  const existing = await prisma.studentAccount.findUnique({ where: { studentId: link.studentId } });
  if (existing) {
    console.log(`Demo child already has a login: code ${existing.loginCode} / PIN ${DEMO_PIN}`);
    return prisma.$disconnect();
  }

  const authId = await provisionAuth(studentEmail(CODE), `${link.student.firstName} ${link.student.lastName}`);
  await prisma.studentAccount.create({ data: { id: authId, studentId: link.studentId, schoolId: school.id, loginCode: CODE } });
  console.log(`  ✓ Student login for ${link.student.firstName} ${link.student.lastName}: code ${CODE} / PIN ${DEMO_PIN}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e.message);
  await prisma.$disconnect();
  process.exit(1);
});
