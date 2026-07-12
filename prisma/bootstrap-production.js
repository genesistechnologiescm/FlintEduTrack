// One-shot bootstrap for a FRESH production instance: creates the first school
// and its first FULL admin so the admin-provisioned onboarding chain can start
// (EduTrack has no self-signup by design). Everything comes from env — no
// hardcoded demo values, nothing sensitive printed.
//
//   npm run db:bootstrap          (reads .env.production.local)
//
// Required env (besides the DB/Supabase keys):
//   BOOTSTRAP_SCHOOL_NAME    e.g. "St. Joseph's College, Bamenda"
//   BOOTSTRAP_SCHOOL_REGION  e.g. "North-West"
//   BOOTSTRAP_ADMIN_PHONE    e.g. "+237670123456" or "670123456"
//   BOOTSTRAP_ADMIN_NAME     e.g. "Mr. John Doe"
//   BOOTSTRAP_ADMIN_PIN      5 digits — NOT the demo PIN
// Optional:
//   BOOTSTRAP_SCHOOL_TOWN, BOOTSTRAP_SCHOOL_CRISIS=1, BOOTSTRAP_ADMIN_TITLE
//
// Guards: refuses if any school already exists (one-shot), refuses the demo
// PIN 12345, refuses malformed phone/PIN.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

// Keep in sync with normalizeCmPhone/phoneToAuthEmail in lib/auth.ts.
function normalizeCmPhone(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (/^237\d{9}$/.test(digits)) return digits;
  if (/^[62]\d{8}$/.test(digits)) return `237${digits}`;
  return digits;
}
const authEmail = (phone) => `p${normalizeCmPhone(phone)}@edutrack.local`;

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function provisionAuth(phone, displayName, pin) {
  const email = authEmail(phone);
  const headers = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
  let res = await fetch(`${SUPA}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password: pin, email_confirm: true, user_metadata: { displayName, phone } }),
  });
  if (res.ok) return (await res.json()).id;
  // Already exists (re-run after a partial failure): find and reset the password.
  res = await fetch(`${SUPA}/auth/v1/admin/users?per_page=1000`, { headers });
  const data = await res.json();
  const found = (data.users || []).find((u) => u.email === email);
  if (!found) throw new Error(`Auth provisioning failed for ${phone} (HTTP ${res.status})`);
  await fetch(`${SUPA}/auth/v1/admin/users/${found.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ password: pin }),
  });
  return found.id;
}

async function main() {
  const name = process.env.BOOTSTRAP_SCHOOL_NAME;
  const region = process.env.BOOTSTRAP_SCHOOL_REGION;
  const phoneRaw = process.env.BOOTSTRAP_ADMIN_PHONE;
  const adminName = process.env.BOOTSTRAP_ADMIN_NAME;
  const pin = process.env.BOOTSTRAP_ADMIN_PIN;

  if (!SUPA || !SERVICE) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  if (!name || !region || !phoneRaw || !adminName || !pin) {
    throw new Error("Missing BOOTSTRAP_* env — see .env.production.example.");
  }
  if (!/^\d{5}$/.test(pin)) throw new Error("BOOTSTRAP_ADMIN_PIN must be exactly 5 digits.");
  if (pin === "12345") throw new Error("Refusing the demo PIN (12345) on a production instance. Choose a real one.");
  const digits = normalizeCmPhone(phoneRaw);
  if (!/^237\d{9}$/.test(digits)) throw new Error(`Phone "${phoneRaw}" does not look like a Cameroon number.`);
  const phone = `+${digits}`;

  const existing = await prisma.school.count();
  if (existing > 0) {
    throw new Error(`This instance already has ${existing} school(s) — bootstrap is one-shot. Add further schools/staff from the app.`);
  }

  const school = await prisma.school.create({
    data: {
      name,
      region,
      town: process.env.BOOTSTRAP_SCHOOL_TOWN || null,
      isCrisisZone: process.env.BOOTSTRAP_SCHOOL_CRISIS === "1",
    },
  });

  const userId = await provisionAuth(phone, adminName, pin);
  await prisma.user.upsert({
    where: { id: userId },
    update: { phone, displayName: adminName },
    create: { id: userId, phone, displayName: adminName, preferredLang: "EN" },
  });
  await prisma.schoolMembership.create({
    data: {
      userId,
      schoolId: school.id,
      role: "ADMIN",
      adminScope: "FULL",
      title: process.env.BOOTSTRAP_ADMIN_TITLE || "Principal",
    },
  });

  console.log(`✔ School created: ${school.name} (${school.region}${school.town ? ", " + school.town : ""})`);
  console.log(`✔ Admin ready:   ${adminName} · ${phone} · PIN set (not shown)`);
  console.log("Sign in on the app, open School setup, and build classes/subjects/terms from there.");
}

main()
  .catch((e) => { console.error("BOOTSTRAP FAILED:", e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
