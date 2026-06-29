// Additive seed: ~7 schools across Cameroon (incl. NW/SW crisis zones) with
// attendance data, so the National Crisis-Impact dashboard has a real story.
// Crisis-zone schools show markedly higher absence. Idempotent: skips if already seeded.
// Run: node prisma/seed-national.js

const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SCHOOLS = [
  { name: "Sacred Heart College Mankon", region: "North West", division: "Mezam", town: "Bamenda", crisis: true },
  { name: "GBHS Bali", region: "North West", division: "Mezam", town: "Bali", crisis: true },
  { name: "Bishop Rogan College", region: "South West", division: "Fako", town: "Buea", crisis: true },
  { name: "GHS Kumba", region: "South West", division: "Meme", town: "Kumba", crisis: true },
  { name: "Lycée de Biyem-Assi", region: "Centre", division: "Mfoundi", town: "Yaoundé", crisis: false },
  { name: "Collège Libermann", region: "Littoral", division: "Wouri", town: "Douala", crisis: false },
  { name: "Lycée Classique de Bafoussam", region: "West", division: "Mifi", town: "Bafoussam", crisis: false },
];

const FIRST = ["Divine","Blessing","Emmanuel","Precious","Favour","Tabi","Ngwa","Bih","Fon","Asong","Ayuk","Sona","Lum","Ngu","Achu","Comfort","Glory","Tabe","Viola","Derick","Clarisse","Roland","Mirabel","Brandon","Nadege","Yannick","Larissa","Gibson","Stephanie","Wilfred","Marcel","Brenda","Eric","Solange","Patrick","Carine","Joel","Rachelle","Boris","Linda"];
const LAST = ["Tabi","Ngwa","Fru","Bih","Asong","Eposi","Achu","Lum","Besong","Ndip","Wirba","Yenla","Ojong","Mokom","Che","Suh","Tanyi","Agbor","Nain","Etta","Nformi","Ashu","Mbah","Ndum","Forba","Tchoua","Nkemta","Mefor","Akoh","Berinyuy","Tita","Fointama","Anyi","Kpwang","Mbella","Eyong","Fokou","Kamga","Sone","Mbeng"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const STUDENTS_PER_SCHOOL = 30;
const DAYS = 6;

async function main() {
  if (await prisma.school.findFirst({ where: { name: SCHOOLS[0].name } })) {
    console.log("  National schools already seeded — skipping. (Delete them to re-seed.)");
    return;
  }

  // recent weekdays (Mon–Sat)
  const days = [];
  const today = new Date();
  for (let i = 1; days.length < DAYS && i < 20; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (d.getDay() >= 1 && d.getDay() <= 6) days.push(d);
  }

  let phoneSeq = 700100;
  let totalStudents = 0;
  let totalRecords = 0;

  for (const s of SCHOOLS) {
    const school = await prisma.school.create({
      data: { name: s.name, region: s.region, division: s.division, town: s.town, isCrisisZone: s.crisis },
    });
    const year = await prisma.academicYear.create({
      data: { schoolId: school.id, label: "2025/2026", startDate: new Date("2025-09-01"), endDate: new Date("2026-07-15"), isCurrent: true },
    });
    const term = await prisma.term.create({
      data: { academicYearId: year.id, label: "Term 1", order: 1, sequenceCount: 2, startDate: new Date("2025-09-01"), endDate: new Date("2025-12-12") },
    });
    const klass = await prisma.classGroup.create({
      data: { schoolId: school.id, academicYearId: year.id, name: "Form 4 A", formLevel: 4, streamType: "SCIENCES" },
    });
    const teacher = await prisma.user.create({
      data: { id: randomUUID(), phone: `+2376${phoneSeq++}`, displayName: `Teacher · ${s.town}`, preferredLang: "EN" },
    });
    await prisma.schoolMembership.create({ data: { userId: teacher.id, schoolId: school.id, role: "TEACHER" } });
    const subject = await prisma.subject.create({ data: { schoolId: school.id, name: "Mathematics", streamType: "SCIENCES" } });
    const slot = await prisma.timetableSlot.create({
      data: { schoolId: school.id, termId: term.id, classGroupId: klass.id, subjectId: subject.id, teacherUserId: teacher.id, dayOfWeek: 1, startTime: "07:30", endTime: "08:25", room: "A1" },
    });

    // students + enrollments
    const students = Array.from({ length: STUDENTS_PER_SCHOOL }, () => ({
      id: randomUUID(), firstName: pick(FIRST), lastName: pick(LAST), gender: Math.random() < 0.5 ? "M" : "F",
    }));
    await prisma.student.createMany({ data: students });
    await prisma.enrollment.createMany({
      data: students.map((st) => ({ id: randomUUID(), studentId: st.id, schoolId: school.id, classGroupId: klass.id, streamType: "SCIENCES", status: "ACTIVE" })),
    });
    totalStudents += students.length;

    // attendance with region-correlated absence rate
    const absenceRate = s.crisis ? 0.26 : 0.07;
    for (let di = 0; di < days.length; di++) {
      const d = days[di];
      const dateISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const periodStartAt = new Date(`${dateISO}T07:30:00.000Z`);
      const session = await prisma.attendanceSession.create({
        data: {
          schoolId: school.id, timetableSlotId: slot.id, classGroupId: klass.id, subjectId: subject.id,
          teacherUserId: teacher.id, date: new Date(`${dateISO}T00:00:00.000Z`), periodStartAt,
          submittedAt: periodStartAt, isLate: false, idempotencyKey: `${slot.id}:${dateISO}`,
        },
      });
      await prisma.attendanceRecord.createMany({
        data: students.map((st) => ({
          id: randomUUID(), sessionId: session.id, studentId: st.id,
          status: Math.random() < absenceRate ? "ABSENT" : "PRESENT", setBy: "TEACHER", setByUserId: teacher.id,
        })),
      });
      totalRecords += students.length;
    }
    console.log(`  ✓ ${s.name} (${s.region}${s.crisis ? " · crisis" : ""}) — ${students.length} students`);
  }

  console.log(`\n  Done: ${SCHOOLS.length} schools, ${totalStudents} students, ${totalRecords} attendance records.`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e.message); await prisma.$disconnect(); process.exit(1); });
