import { prisma } from "@/lib/prisma";
import { sendWebPush } from "./sendWebPush";

// ── Mock sender ──────────────────────────────────────────────
// Logs instead of sending. Swap for Africa's Talking at pilot (Notification
// Router, doc 05) — this is the ONLY thing that changes to go live.
async function mockSend(channel: "SMS", to: string, body: string) {
  // Dev-only visibility — never a parent's phone or child's name in production
  // logs (security review #6). NotificationLog already records the send.
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`[MOCK ${channel}] -> ${to}: ${body}`);
  }
  return {
    providerMsgId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    costFcfa: 5, // Africa's Talking ~5 FCFA/SMS (real cost logged once live)
  };
}

function absenceMessage(lang: "EN" | "FR", studentName: string, dateISO: string, school: string) {
  return lang === "FR"
    ? `EduTrack : ${studentName} a été marqué(e) absent(e) aujourd'hui (${dateISO}). — ${school}`
    : `EduTrack: ${studentName} was marked absent today (${dateISO}). — ${school}`;
}

// Fires parent absence alerts through the (mock) router.
// Hybrid model (doc 02): the first unexcused absence per parent per day is
// immediate; subsequent ones are queued into the 17:00 digest. Idempotent per
// (parent, student, day) so re-submitting attendance never double-notifies.
export async function sendAbsenceAlerts(params: {
  schoolId: string;
  schoolName: string;
  dateISO: string;
  absentStudentIds: string[];
}): Promise<{ sent: number; queued: number }> {
  const { schoolId, schoolName, dateISO, absentStudentIds } = params;
  if (absentStudentIds.length === 0) return { sent: 0, queued: 0 };

  const students = await prisma.student.findMany({ where: { id: { in: absentStudentIds } } });
  const nameById = new Map(students.map((s) => [s.id, `${s.firstName} ${s.lastName}`]));

  const dayStart = new Date(`${dateISO}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateISO}T23:59:59.999Z`);

  let sent = 0;
  let queued = 0;

  for (const studentId of absentStudentIds) {
    const links = await prisma.parentLink.findMany({
      where: { studentId, schoolId, status: "active", receivesAlerts: true },
      include: { parent: true },
    });

    for (const link of links) {
      const idempotencyKey = `${link.parentUserId}:${studentId}:${dateISO}:absence`;
      const existing = await prisma.notificationLog.findUnique({ where: { idempotencyKey } });
      if (existing) continue;

      const priorCriticalToday = await prisma.notificationLog.count({
        where: {
          parentUserId: link.parentUserId,
          criticality: "CRITICAL",
          serverSentAt: { gte: dayStart, lte: dayEnd },
        },
      });
      const immediate = priorCriticalToday === 0;
      const body = absenceMessage(
        link.parent.preferredLang,
        nameById.get(studentId) ?? "your child",
        dateISO,
        schoolName,
      );

      if (immediate) {
        const res = await mockSend("SMS", link.parent.phone, body);
        await prisma.notificationLog.create({
          data: {
            parentUserId: link.parentUserId,
            studentId,
            eventType: "ABSENCE_FIRST_UNEXCUSED",
            criticality: "CRITICAL",
            channelAttempted: "SMS",
            channelSucceeded: "SMS",
            costFcfa: res.costFcfa,
            idempotencyKey,
            deliveryStatus: "SENT",
            providerMsgId: res.providerMsgId,
          },
        });
        sent++;
      } else {
        await prisma.notificationLog.create({
          data: {
            parentUserId: link.parentUserId,
            studentId,
            eventType: "ABSENCE_DIGEST",
            criticality: "ROUTINE",
            channelAttempted: "SMS",
            costFcfa: 0,
            idempotencyKey,
            deliveryStatus: "QUEUED",
          },
        });
        queued++;
      }

      // Free active push to the parent's installed PWA, if they've subscribed.
      const push = await prisma.parentChannel.findFirst({
        where: { parentUserId: link.parentUserId, type: "PUSH", optedIn: true },
      });
      if (push) {
        try {
          await sendWebPush(JSON.parse(push.address), { title: "EduTrack", body, url: "/parent" });
        } catch {
          // best-effort — never block the attendance commit
        }
      }
    }
  }

  return { sent, queued };
}
