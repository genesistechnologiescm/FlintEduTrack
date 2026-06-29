// Seeds one demo parent↔staff conversation (parent message + staff reply) so the
// /parent/messages and /admin/messages inboxes show content with unread states.
// Idempotent: skips by (parent, subject). Run: node prisma/seed-messages.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const PARENT_PHONE = "+237699000001";
const SUBJECT = "Divine's absence on Monday";

async function main() {
  const parent = await prisma.user.findUnique({ where: { phone: PARENT_PHONE } });
  if (!parent) return console.log("demo parent not found — run seed-parent.js first");

  const link = await prisma.parentLink.findFirst({
    where: { parentUserId: parent.id, status: "active" },
    include: { student: true },
  });
  if (!link) return console.log("demo parent has no linked child");

  const existing = await prisma.messageThread.findFirst({ where: { parentUserId: parent.id, subject: SUBJECT } });
  if (existing) return console.log("demo thread already exists — nothing to do");

  const admin = await prisma.schoolMembership.findFirst({
    where: { schoolId: link.schoolId, role: "ADMIN", status: "active" },
  });

  const thread = await prisma.messageThread.create({
    data: {
      schoolId: link.schoolId,
      parentUserId: parent.id,
      studentId: link.studentId,
      staffUserId: admin?.userId ?? null,
      subject: SUBJECT,
      messages: {
        create: [
          {
            senderUserId: parent.id,
            fromParent: true,
            body: "Good morning. Divine was unwell on Monday and could not come to school. I have a note from the clinic. How can I send it?",
            readAt: null, // unread for staff
          },
          ...(admin
            ? [
                {
                  senderUserId: admin.userId,
                  fromParent: false,
                  body: "Thank you for letting us know. You can bring the clinic note to the front office, or reply here with a photo. We have marked it as an excused absence for now.",
                  readAt: null, // unread for parent
                },
              ]
            : []),
        ],
      },
    },
  });
  console.log(`Created demo thread "${SUBJECT}" for ${link.student.firstName} ${link.student.lastName} (thread ${thread.id}).`);
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
