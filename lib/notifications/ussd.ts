// USSD self-service (Phase-3 cost item) — the free "pull" path for
// feature-phone parents: dial *123#, get the child's day. This module is the
// REAL handler; at activation the telco/aggregator (e.g. Africa's Talking)
// simply points its USSD callback at /api/ussd — the Chariot pattern.
//
// Contract (Africa's Talking): respond plain text, "CON " to continue a
// session (menu), "END " to finish.
import { prisma } from "@/lib/prisma";
import { getStudentBalance } from "@/lib/feeBalance";
import { upcomingEvents } from "@/lib/calendarFeed";
import { formatFcfa } from "@/lib/fees";

type Lang = "EN" | "FR";

const T = {
  EN: {
    menu: "EduTrack\n1. Attendance today\n2. School fees\n3. Next school event",
    noParent: "This number is not registered with EduTrack. Ask your school to add you.",
    present: "present",
    absent: "ABSENT",
    noMarks: "no attendance recorded yet today",
    feesLine: (name: string, bal: number) => (bal > 0 ? `${name}: ${formatFcfa(bal)} outstanding` : `${name}: fully paid`),
    noEvents: "No upcoming school events.",
    invalid: "Invalid choice.",
  },
  FR: {
    menu: "EduTrack\n1. Présence aujourd'hui\n2. Frais de scolarité\n3. Prochain événement",
    noParent: "Ce numéro n'est pas enregistré sur EduTrack. Demandez à l'école de vous ajouter.",
    present: "présent(e)",
    absent: "ABSENT(E)",
    noMarks: "aucun appel enregistré aujourd'hui",
    feesLine: (name: string, bal: number) => (bal > 0 ? `${name} : ${formatFcfa(bal)} restant` : `${name} : soldé`),
    noEvents: "Aucun événement scolaire à venir.",
    invalid: "Choix invalide.",
  },
} as const;

async function parentByPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return prisma.user.findFirst({
    where: { OR: [{ phone }, { phone: `+${digits}` }] },
  });
}

async function childrenOf(parentUserId: string) {
  const links = await prisma.parentLink.findMany({
    where: { parentUserId, status: "active" },
    include: { student: { select: { id: true, firstName: true } } },
  });
  return links.map((l) => ({ studentId: l.studentId, name: l.student.firstName }));
}

export async function attendanceToday(parentUserId: string, lang: Lang): Promise<string> {
  const t = T[lang];
  const kids = await childrenOf(parentUserId);
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  for (const kid of kids) {
    const records = await prisma.attendanceRecord.findMany({
      where: { studentId: kid.studentId, session: { date: new Date(today) } },
    });
    if (records.length === 0) lines.push(`${kid.name}: ${t.noMarks}`);
    else {
      const absent = records.filter((r) => r.status === "ABSENT").length;
      lines.push(`${kid.name}: ${absent > 0 ? t.absent : t.present} (${records.length - absent}/${records.length})`);
    }
  }
  return lines.join("\n");
}

async function feesStatus(parentUserId: string, lang: Lang): Promise<string> {
  const t = T[lang];
  const kids = await childrenOf(parentUserId);
  const lines: string[] = [];
  for (const kid of kids) {
    const { balance } = await getStudentBalance(kid.studentId);
    lines.push(t.feesLine(kid.name, Math.max(0, balance)));
  }
  return lines.join("\n");
}

async function nextEvent(parentUserId: string, lang: Lang): Promise<string> {
  const links = await prisma.parentLink.findMany({
    where: { parentUserId, status: "active" },
    select: { schoolId: true },
  });
  const events = await upcomingEvents([...new Set(links.map((l) => l.schoolId))], 1);
  if (events.length === 0) return T[lang].noEvents;
  const e = events[0];
  return `${e.title} — ${e.startDate}${e.endDate ? ` → ${e.endDate}` : ""}`;
}

// The USSD session handler. `text` is the caller's input so far ("" on dial).
export async function handleUssd(phone: string, text: string): Promise<string> {
  const parent = await parentByPhone(phone);
  if (!parent) return `END ${T.EN.noParent}`;
  const lang: Lang = parent.preferredLang === "FR" ? "FR" : "EN";
  const t = T[lang];

  const choice = text.trim().split("*").pop() ?? "";
  if (choice === "") return `CON ${t.menu}`;
  if (choice === "1") return `END ${await attendanceToday(parent.id, lang)}`;
  if (choice === "2") return `END ${await feesStatus(parent.id, lang)}`;
  if (choice === "3") return `END ${await nextEvent(parent.id, lang)}`;
  return `END ${t.invalid}`;
}
