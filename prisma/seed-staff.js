// Titles the existing demo staff and adds a second ADMIN (a Bursar) so the
// Staff & roles screen shows multi-admin with job titles. Idempotent.
// Run: node --env-file=.env --env-file=.env.local prisma/seed-staff.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_PIN = "12345";
const BURSAR_PHONE = "+237670000002";
const authHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
const authEmail = (phone) => `p${phone.replace(/\D/g, "")}@edutrack.local`;

async function provisionAuth(phone, displayName) {
  const email = authEmail(phone);
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ email, password: DEMO_PIN, email_confirm: true, user_metadata: { displayName, phone } }),
  });
  if (res.ok) return (await res.json()).id;
  const list = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, { headers: authHeaders });
  const found = (await list.json()).users.find((u) => u.email === email);
  if (!found) throw new Error(`provisionAuth failed: HTTP ${res.status}`);
  return found.id;
}

async function setTitle(phone, title) {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return;
  const m = await prisma.schoolMembership.findFirst({ where: { userId: user.id, status: "active" } });
  if (m) await prisma.schoolMembership.update({ where: { id: m.id }, data: { title } });
}

async function main() {
  const school = await prisma.school.findFirst({ where: { name: "Demo Secondary School, Bamenda" } });
  if (!school) return console.log("demo school not found");

  await setTitle("+237670000000", "Principal");
  await setTitle("+237670000001", "Senior Teacher");

  // Second admin (Bursar)
  let bursar = await prisma.user.findUnique({ where: { phone: BURSAR_PHONE } });
  if (!bursar) {
    const id = await provisionAuth(BURSAR_PHONE, "Mr. Forba Andrew");
    bursar = await prisma.user.create({ data: { id, phone: BURSAR_PHONE, displayName: "Mr. Forba Andrew" } });
  }
  const existing = await prisma.schoolMembership.findFirst({ where: { userId: bursar.id, schoolId: school.id } });
  if (existing) {
    await prisma.schoolMembership.update({ where: { id: existing.id }, data: { role: "ADMIN", title: "Bursar", status: "active" } });
  } else {
    await prisma.schoolMembership.create({ data: { userId: bursar.id, schoolId: school.id, role: "ADMIN", title: "Bursar" } });
  }

  console.log("  ✓ Titled Principal + Senior Teacher; added Bursar admin", BURSAR_PHONE, "/ PIN", DEMO_PIN);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e.message);
  await prisma.$disconnect();
  process.exit(1);
});
