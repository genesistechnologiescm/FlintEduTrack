// Creates a demo GOVERNMENT (ministry) account that lands on the read-only,
// aggregate-only national dashboard at /government. Idempotent.
// Run: node --env-file=.env --env-file=.env.local prisma/seed-government.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_PIN = "12345";
const PHONE = "+237600000000";
const NAME = "Ministry of Secondary Education";
const authHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
// Keep in sync with normalizeCmPhone/phoneToAuthEmail in lib/auth.ts — local
// 9-digit numbers get the 237 country code so seeding and login map identically.
const normalizeCmPhone = (p) => {
  const d = p.replace(/\D/g, "");
  return /^237\d{9}$/.test(d) ? d : /^[62]\d{8}$/.test(d) ? `237${d}` : d;
};
const authEmail = (phone) => `p${normalizeCmPhone(phone)}@edutrack.local`;

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
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${found.id}`, { method: "PUT", headers: authHeaders, body: JSON.stringify({ password: DEMO_PIN }) });
  return found.id;
}

async function main() {
  const id = await provisionAuth(PHONE, NAME);
  await prisma.user.upsert({
    where: { id },
    update: { phone: PHONE, displayName: NAME, isGovernment: true },
    create: { id, phone: PHONE, displayName: NAME, isGovernment: true, preferredLang: "EN" },
  });
  console.log(`  ✓ Government account: ${PHONE} / PIN ${DEMO_PIN} → /government`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e.message);
  await prisma.$disconnect();
  process.exit(1);
});
