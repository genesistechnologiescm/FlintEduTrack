// Separates the two roles that were fused on one demo account:
//   1) Creates a PURE Flint owner (isFlintAdmin=true, NO school membership) —
//      registers/oversees schools but cannot operate inside any single school.
//   2) Demotes the demo school admin (was also isFlintAdmin) to a plain school
//      admin, so the owner powers no longer ride along with school access.
// Idempotent. Run: npm run db:seed:owner
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }, // 6543 pooler (5432 blocked on this network)
});

const OWNER_PHONE = "+237653158701";
const OWNER_NAME = "Kfusaluh Kesi Ghangha";
const OWNER_PIN = "12345";
const DEMO_ADMIN_PHONE = "+237670000000"; // keeps ADMIN membership, loses owner flag

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const authEmail = (phone) => `p${phone.replace(/\D/g, "")}@edutrack.local`;

async function provisionAuth(phone, displayName, pin) {
  if (!SUPA || !SERVICE) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  const headers = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
  const email = authEmail(phone);
  let res = await fetch(`${SUPA}/auth/v1/admin/users`, {
    method: "POST", headers,
    body: JSON.stringify({ email, password: pin, email_confirm: true, user_metadata: { displayName, phone } }),
  });
  if (res.ok) return (await res.json()).id;
  res = await fetch(`${SUPA}/auth/v1/admin/users?per_page=2000`, { headers });
  const found = ((await res.json()).users || []).find((u) => u.email === email);
  if (!found) throw new Error(`provisionAuth failed for ${phone} (HTTP ${res.status})`);
  await fetch(`${SUPA}/auth/v1/admin/users/${found.id}`, { method: "PUT", headers, body: JSON.stringify({ password: pin }) });
  return found.id;
}

async function main() {
  const id = await provisionAuth(OWNER_PHONE, OWNER_NAME, OWNER_PIN);
  await prisma.user.upsert({
    where: { id },
    update: { phone: OWNER_PHONE, displayName: OWNER_NAME, isFlintAdmin: true },
    create: { id, phone: OWNER_PHONE, displayName: OWNER_NAME, isFlintAdmin: true, preferredLang: "EN" },
  });
  const ownerSchools = await prisma.schoolMembership.count({ where: { userId: id } });
  console.log(`owner ${OWNER_NAME} (${OWNER_PHONE}): isFlintAdmin=true, school memberships=${ownerSchools} (must be 0)`);

  const demoted = await prisma.user.updateMany({ where: { phone: DEMO_ADMIN_PHONE }, data: { isFlintAdmin: false } });
  console.log(`demoted ${DEMO_ADMIN_PHONE}: isFlintAdmin -> false (${demoted.count} row updated)`);

  const owners = await prisma.user.findMany({ where: { isFlintAdmin: true }, select: { phone: true, displayName: true } });
  console.log("Flint owners now:", owners.map((u) => `${u.displayName} ${u.phone}`).join(" | "));
}

main().catch((e) => { console.error("SEED FAILED:", e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
