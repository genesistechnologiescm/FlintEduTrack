"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { handleUssd, attendanceToday } from "@/lib/notifications/ussd";
import { pickPaidChannel, deliver } from "@/lib/notifications/router";

async function adminContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const m = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, role: "ADMIN", status: "active" },
  });
  if (!m) throw new Error("Not authorized");
  return { userId: user.id };
}

const SimSchema = z.object({
  phone: z.string().trim().min(6).max(20),
  text: z.string().trim().max(40),
});

// Simulator runs the REAL handler (same code the telco callback hits).
export async function simulateUssd(raw: z.infer<typeof SimSchema>): Promise<{ ok: boolean; reply?: string; error?: string }> {
  const input = SimSchema.parse(raw);
  await adminContext();
  const reply = await handleUssd(input.phone, input.text);
  return { ok: true, reply };
}

// Missed-call nudge stub: parent "beeps" the school line → we send back
// today's status on their cheapest channel (Router v2, mock). Idempotent/day.
export async function simulateMissedCall(rawPhone: string): Promise<{ ok: boolean; sent?: string; channel?: string; error?: string }> {
  const phone = z.string().trim().min(6).max(20).parse(rawPhone);
  await adminContext();

  const digits = phone.replace(/\D/g, "");
  const parent = await prisma.user.findFirst({ where: { OR: [{ phone }, { phone: `+${digits}` }] } });
  if (!parent) return { ok: false, error: "Number not registered" };

  const body = await attendanceToday(parent.id, parent.preferredLang === "FR" ? "FR" : "EN");
  const today = new Date().toISOString().slice(0, 10);
  const idempotencyKey = `${parent.id}:missedcall:${today}`;
  const exists = await prisma.notificationLog.findUnique({ where: { idempotencyKey } });
  if (exists) return { ok: true, sent: body, channel: String(exists.channelSucceeded ?? "SMS") };

  const push = await prisma.parentChannel.findFirst({ where: { parentUserId: parent.id, type: "PUSH", optedIn: true } });
  const channel = pickPaidChannel(parent.contactCapability, !!push) ?? "SMS"; // a beep always earns a reply
  const res = await deliver(channel, parent.phone, body);
  await prisma.notificationLog.create({
    data: {
      parentUserId: parent.id,
      eventType: "MISSED_CALL_STATUS",
      criticality: "ROUTINE",
      channelAttempted: channel,
      channelSucceeded: channel,
      costFcfa: res.costFcfa,
      idempotencyKey,
      deliveryStatus: "SENT",
      providerMsgId: res.providerMsgId,
    },
  });
  return { ok: true, sent: body, channel };
}
