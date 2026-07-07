// EduTrack seed — a realistic Bamenda demo school for building/testing against.
// Re-runnable: wipes existing rows first (DEMO database only).
// Run: node prisma/seed.js   (or npm run db:seed)

const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const DEMO_PIN = "12345";
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

// Create/fetch a Supabase auth user via the GoTrue admin REST API (fetch — avoids
// the supabase-js realtime/WebSocket dependency on Node < 22). Returns its id so
// our User.id === auth.users.id (required by RLS + authorization).
async function provisionAuth(phone, displayName) {
  const email = authEmail(phone);
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ email, password: DEMO_PIN, email_confirm: true, user_metadata: { displayName, phone } }),
  });
  if (res.ok) return (await res.json()).id;
  // Already exists → find it and reset the PIN to the demo value.
  const list = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, { headers: authHeaders });
  const data = await list.json();
  const found = (data.users || []).find((u) => u.email === email);
  if (!found) throw new Error(`provisionAuth failed for ${phone}: HTTP ${res.status}`);
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${found.id}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({ password: DEMO_PIN }),
  });
  return found.id;
}

const STUDENTS = [
  ["Divine", "Tabi", "M"], ["Blessing", "Ngwa", "F"], ["Emmanuel", "Fru", "M"],
  ["Precious", "Bih", "F"], ["Nkeng", "Asong", "M"], ["Favour", "Eposi", "F"],
  ["Tata", "Achu", "M"], ["Manka'a", "Lum", "F"], ["Ayuk", "Besong", "M"],
  ["Sona", "Ndip", "F"], ["Fon", "Wirba", "M"], ["Bih", "Yenla", "F"],
  ["Tanyi", "Ojong", "M"], ["Akwi", "Mokom", "F"], ["Nfor", "Che", "M"],
  ["Lum", "Suh", "F"], ["Ngu", "Tanyi", "M"], ["Eposi", "Agbor", "F"],
  ["Achu", "Nain", "M"], ["Comfort", "Ngwa", "F"], ["Etta", "Bisong", "M"],
  ["Glory", "Nformi", "F"], ["Tabe", "Ashu", "M"], ["Viola", "Fointama", "F"],
  ["Derick", "Mbah", "M"], ["Clarisse", "Ndum", "F"], ["Roland", "Kpwang", "M"],
  ["Mirabel", "Anyi", "F"], ["Brandon", "Forba", "M"], ["Nadege", "Tchoua", "F"],
  ["Yannick", "Nkemta", "M"], ["Larissa", "Mefor", "F"], ["Gibson", "Akoh", "M"],
  ["Stephanie", "Berinyuy", "F"], ["Wilfred", "Tita", "M"],
];

async function wipe() {
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.absenceAuthorisation.deleteMany();
  await prisma.welfareEvent.deleteMany();
  await prisma.welfareCase.deleteMany();
  await prisma.suspensionLog.deleteMany();
  await prisma.conflictLog.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.parentChannel.deleteMany();
  await prisma.parentLink.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.timetableSlot.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.classGroup.deleteMany();
  await prisma.term.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.schoolMembership.deleteMany();
  await prisma.authDevice.deleteMany();
  await prisma.authAttempt.deleteMany();
  await prisma.student.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();
}

async function main() {
  await wipe();

  const school = await prisma.school.create({
    data: {
      name: "Demo Secondary School, Bamenda",
      region: "North West",
      division: "Mezam",
      town: "Bamenda",
      contactPhone: "+237233360000",
      isCrisisZone: true,
    },
  });

  const year = await prisma.academicYear.create({
    data: {
      schoolId: school.id,
      label: "2025/2026",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-07-15"),
      isCurrent: true,
    },
  });

  const term = await prisma.term.create({
    data: {
      academicYearId: year.id,
      label: "Term 1",
      order: 1,
      sequenceCount: 2,
      startDate: new Date("2025-09-01"),
      endDate: new Date("2025-12-12"),
    },
  });

  const klass = await prisma.classGroup.create({
    data: {
      schoolId: school.id,
      academicYearId: year.id,
      name: "Form 5 Science A",
      formLevel: 5,
      streamType: "SCIENCES",
      isGceClass: true,
    },
  });

  const adminId = await provisionAuth("+237670000000", "Mrs. Ngwa Comfort");
  const admin = await prisma.user.create({
    data: { id: adminId, phone: "+237670000000", displayName: "Mrs. Ngwa Comfort", preferredLang: "EN" },
  });
  await prisma.schoolMembership.create({ data: { userId: admin.id, schoolId: school.id, role: "ADMIN" } });

  const teacherId = await provisionAuth("+237670000001", "Mr. Tabe Divine");
  const teacher = await prisma.user.create({
    data: { id: teacherId, phone: "+237670000001", displayName: "Mr. Tabe Divine", preferredLang: "EN" },
  });
  await prisma.schoolMembership.create({ data: { userId: teacher.id, schoolId: school.id, role: "TEACHER" } });

  const subjectNames = ["Mathematics", "Physics", "Chemistry", "Biology", "English Language"];
  const subjects = {};
  for (const name of subjectNames) {
    subjects[name] = await prisma.subject.create({
      data: { schoolId: school.id, name, streamType: "SCIENCES" },
    });
  }

  const slots = [
    { day: 1, start: "07:30", end: "08:25", subj: "Mathematics" },
    { day: 1, start: "08:25", end: "09:20", subj: "Physics" },
    { day: 2, start: "07:30", end: "08:25", subj: "Chemistry" },
    { day: 3, start: "07:30", end: "08:25", subj: "Biology" },
    { day: 4, start: "07:30", end: "08:25", subj: "English Language" },
  ];
  for (const s of slots) {
    await prisma.timetableSlot.create({
      data: {
        schoolId: school.id,
        termId: term.id,
        classGroupId: klass.id,
        subjectId: subjects[s.subj].id,
        teacherUserId: teacher.id,
        dayOfWeek: s.day,
        startTime: s.start,
        endTime: s.end,
        room: "Block A",
      },
    });
  }

  let phoneN = 1000;
  for (const [first, last, gender] of STUDENTS) {
    const student = await prisma.student.create({ data: { firstName: first, lastName: last, gender } });
    await prisma.enrollment.create({
      data: { studentId: student.id, schoolId: school.id, classGroupId: klass.id, streamType: "SCIENCES", status: "ACTIVE" },
    });
    const parent = await prisma.user.create({
      data: {
        id: randomUUID(),
        phone: `+23768${String(phoneN++).padStart(6, "0")}`,
        displayName: `Parent of ${first} ${last}`,
        preferredLang: phoneN % 2 === 0 ? "EN" : "FR",
      },
    });
    await prisma.parentLink.create({
      data: { parentUserId: parent.id, studentId: student.id, schoolId: school.id, relationship: "GUARDIAN", isPrimary: true, receivesAlerts: true },
    });
  }

  console.log("\n  ✓ Seed complete");
  console.log("  School   :", school.name);
  console.log("  Class    :", klass.name, "(GCE, crisis-zone school)");
  console.log("  Admin    : Mrs. Ngwa Comfort  +237670000000");
  console.log("  Teacher  : Mr. Tabe Divine    +237670000001");
  console.log("  Students :", await prisma.student.count());
  console.log("  Subjects :", await prisma.subject.count());
  console.log("  Timetable:", await prisma.timetableSlot.count(), "periods/week");
  console.log("  Parents  :", await prisma.parentLink.count(), "guardian links");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
