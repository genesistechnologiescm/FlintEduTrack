// The 17:00 digest (Phase-1 hybrid model, doc 02): absences after a parent's
// first real-time alert of the day sit as QUEUED ABSENCE_DIGEST rows; this
// flushes them — ONE summary per parent (one SMS cost, not one per absence),
// plus a free web push. Idempotent: only QUEUED rows are processed and they
// flip to SENT. Called by the Vercel cron (16:00 UTC = 17:00 Cameroon).
import { prisma } from "@/lib/prisma";
import { sendWebPush } from "./sendWebPush";

function digestBody(lang: "EN" | "FR", names: string[], count: number): string {
  const list = names.join(", ");
  return lang === "FR"
    ? `EduTrack — récapitulatif du jour : ${count} absence(s) supplémentaire(s) enregistrée(s) pour ${list}. Ouvrez EduTrack pour les détails.`
    : `EduTrack daily digest: ${count} further absence(s) recorded for ${list}. Open EduTrack for details.`;
}

export async function sendDigest(): Promise<{ parents: number; absences: number; costFcfa: number }> {
  const pending = await prisma.notificationLog.findMany({
    where: { eventType: "ABSENCE_DIGEST", deliveryStatus: "QUEUED" },
    orderBy: { serverSentAt: "asc" },
  });
  if (pending.length === 0) return { parents: 0, absences: 0, costFcfa: 0 };

  // Group by parent.
  const byParent = new Map<string, typeof pending>();
  for (const row of pending) {
    const list = byParent.get(row.parentUserId) ?? [];
    list.push(row);
    byParent.set(row.parentUserId, list);
  }

  const parents = await prisma.user.findMany({ where: { id: { in: [...byParent.keys()] } } });
  const parentById = new Map(parents.map((p) => [p.id, p]));

  const studentIds = [...new Set(pending.map((r) => r.studentId).filter((s): s is string => !!s))];
  const students = studentIds.length
    ? await prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, firstName: true } })
    : [];
  const nameById = new Map(students.map((s) => [s.id, s.firstName]));

  let totalCost = 0;

  for (const [parentUserId, rows] of byParent) {
    const parent = parentById.get(parentUserId);
    if (!parent) continue;

    const names = [...new Set(rows.map((r) => (r.studentId ? nameById.get(r.studentId) : null)).filter((n): n is string => !!n))];
    const body = digestBody(parent.preferredLang, names.length ? names : ["your child"], rows.length);

    // One mock SMS per parent — the whole point of batching.
    const providerMsgId = `mock_digest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const smsCost = 5;
    totalCost += smsCost;

    const now = new Date();
    // Cost lands on the first row of the batch; the rest flip to SENT at 0 cost.
    await prisma.notificationLog.update({
      where: { id: rows[0].id },
      data: { deliveryStatus: "SENT", channelSucceeded: "SMS", providerMsgId, costFcfa: smsCost, deliveredAt: now },
    });
    if (rows.length > 1) {
      await prisma.notificationLog.updateMany({
        where: { id: { in: rows.slice(1).map((r) => r.id) } },
        data: { deliveryStatus: "SENT", channelSucceeded: "SMS", providerMsgId, deliveredAt: now },
      });
    }

    // Free push too, if the parent's PWA is subscribed.
    const push = await prisma.parentChannel.findFirst({
      where: { parentUserId, type: "PUSH", optedIn: true },
    });
    if (push) {
      try {
        await sendWebPush(JSON.parse(push.address), { title: "EduTrack", body, url: "/parent" });
      } catch {
        // best-effort
      }
    }
  }

  return { parents: byParent.size, absences: pending.length, costFcfa: totalCost };
}
