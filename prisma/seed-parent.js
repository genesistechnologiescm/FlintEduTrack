// Creates a demo PARENT account linked to 2 children across 2 schools (showcasing
// platform-level identity), plus a few absence alerts so the feed has content.
// Idempotent. Run: node --env-file=.env --env-file=.env.local prisma/seed-parent.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_PIN = "12345";
const PHONE = "+237699000001";
const authHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};
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
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${found.id}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({ password: DEMO_PIN }),
  });
  return found.id;
}

async function main() {
  const parentId = await provisionAuth(PHONE, "Mrs. Demo Parent");
  await prisma.user.upsert({
    where: { id: parentId },
    update: { phone: PHONE, displayName: "Mrs. Demo Parent" },
    create: { id: parentId, phone: PHONE, displayName: "Mrs. Demo Parent", preferredLang: "EN" },
  });

  const demoSchool = await prisma.school.findFirst({ where: { name: "Demo Secondary School, Bamenda" } });
  const e1 = demoSchool
    ? await prisma.enrollment.findFirst({ where: { schoolId: demoSchool.id }, include: { student: true }, orderBy: { enrolledAt: "asc" } })
    : null;
  const lib = await prisma.school.findFirst({ where: { name: "Collège Libermann" } });
  const e2 = lib ? await prisma.enrollment.findFirst({ where: { schoolId: lib.id }, include: { student: true } }) : null;

  for (const e of [e1, e2].filter(Boolean)) {
    await prisma.parentLink.upsert({
      where: { parentUserId_studentId_schoolId: { parentUserId: parentId, studentId: e.studentId, schoolId: e.schoolId } },
      update: { status: "active", receivesAlerts: true },
      create: { parentUserId: parentId, studentId: e.studentId, schoolId: e.schoolId, relationship: "MOTHER", isPrimary: true, receivesAlerts: true },
    });
  }

  if (e1) {
    const today = new Date();
    for (const back of [2, 4, 7]) {
      const d = new Date(today);
      d.setDate(d.getDate() - back);
      const dateISO = d.toISOString().slice(0, 10);
      const idempotencyKey = `${parentId}:${e1.studentId}:${dateISO}:absence`;
      await prisma.notificationLog.upsert({
        where: { idempotencyKey },
        update: {},
        create: {
          parentUserId: parentId, studentId: e1.studentId, eventType: "ABSENCE_FIRST_UNEXCUSED",
          criticality: "CRITICAL", channelAttempted: "SMS", channelSucceeded: "SMS", costFcfa: 5,
          idempotencyKey, deliveryStatus: "SENT", serverSentAt: d,
        },
      });
    }
  }

  console.log("  ✓ Demo parent:", PHONE, "/ PIN", DEMO_PIN);
  console.log("  Children:", [e1?.student, e2?.student].filter(Boolean).map((s) => `${s.firstName} ${s.lastName}`).join(" · "));
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e.message); await prisma.$disconnect(); process.exit(1); });
