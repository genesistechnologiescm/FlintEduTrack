// Seeds fee items for the demo school's current term + part-pays a share of
// students (so the admin fee dashboard shows a realistic collection rate). The
// demo parent's child is left UNPAID so the live "Pay with MoMo" flow can be shown.
// Idempotent. Run: node prisma/seed-fees.js

const { PrismaClient } = require("@prisma/client");
const { randomBytes } = require("crypto");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SCHOOL = "Demo Secondary School, Bamenda";
const DEMO_PARENT_PHONE = "+237699000001";
const FEES = [
  { label: "Third Term tuition", amount: 75000 },
  { label: "PTA levy", amount: 5000 },
  { label: "Examination fees", amount: 10000 },
];

async function main() {
  const school = await prisma.school.findFirst({ where: { name: SCHOOL } });
  if (!school) return console.log("demo school not found");
  const admin = await prisma.schoolMembership.findFirst({ where: { schoolId: school.id, role: "ADMIN", status: "active" } });
  const year = await prisma.academicYear.findFirst({ where: { schoolId: school.id, isCurrent: true } });
  const term = year ? await prisma.term.findFirst({ where: { academicYearId: year.id }, orderBy: { order: "asc" } }) : null;
  if (!term) return console.log("no current term — run the main seed first");

  // Fee items (all-classes), idempotent by label.
  let feeTotal = 0;
  for (const f of FEES) {
    feeTotal += f.amount;
    const existing = await prisma.feeItem.findFirst({ where: { schoolId: school.id, termId: term.id, label: f.label, deletedAt: null } });
    if (existing) continue;
    await prisma.feeItem.create({
      data: { schoolId: school.id, termId: term.id, classGroupId: null, label: f.label, amount: f.amount, createdBy: admin?.userId ?? "system" },
    });
  }

  // Don't double-seed payments.
  const already = await prisma.payment.count({ where: { schoolId: school.id } });
  if (already > 0) {
    console.log(`Fee items ensured. Payments already present (${already}) — skipping payment seed.`);
    return prisma.$disconnect();
  }

  // Identify the demo child to leave unpaid.
  const demoParent = await prisma.user.findUnique({ where: { phone: DEMO_PARENT_PHONE } });
  const demoLink = demoParent
    ? await prisma.parentLink.findFirst({ where: { parentUserId: demoParent.id, schoolId: school.id, status: "active" } })
    : null;
  const skipStudentId = demoLink?.studentId ?? null;

  const enrollments = await prisma.enrollment.findMany({ where: { schoolId: school.id, status: "ACTIVE" }, select: { studentId: true } });
  let paidCount = 0;
  for (let i = 0; i < enrollments.length; i++) {
    const { studentId } = enrollments[i];
    if (studentId === skipStudentId) continue;
    if (i % 5 >= 2) continue; // ~40% of students have paid in full
    await prisma.payment.create({
      data: {
        schoolId: school.id,
        studentId,
        amount: feeTotal,
        method: "MOMO",
        reference: `MOMO-${randomBytes(4).toString("hex").toUpperCase()}`,
        note: "Seeded demo payment",
      },
    });
    paidCount++;
  }
  console.log(`Done. ${FEES.length} fee items (${feeTotal} FCFA/student); ${paidCount} students paid in full; demo child left unpaid.`);
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
