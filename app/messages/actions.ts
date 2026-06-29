"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { sendWebPush } from "@/lib/notifications/sendWebPush";

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

const StartSchema = z.object({
  studentId: z.string().uuid(),
  subject: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
});

// A parent opens a conversation with their child's school.
export async function startThread(raw: z.infer<typeof StartSchema>): Promise<{ ok: boolean; threadId?: string; error?: string }> {
  const input = StartSchema.parse(raw);
  const me = await requireUserId();

  const link = await prisma.parentLink.findFirst({
    where: { parentUserId: me, studentId: input.studentId, status: "active" },
  });
  if (!link) return { ok: false, error: "Not your child" };

  const thread = await prisma.messageThread.create({
    data: {
      schoolId: link.schoolId,
      parentUserId: me,
      studentId: input.studentId,
      subject: input.subject,
      messages: { create: { senderUserId: me, fromParent: true, body: input.body } },
    },
  });
  revalidatePath("/parent/messages");
  revalidatePath("/admin/messages");
  return { ok: true, threadId: thread.id };
}

const SendSchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

// Either side replies. The parent owns the thread; any staff of the school may answer.
export async function sendMessage(raw: z.infer<typeof SendSchema>): Promise<{ ok: boolean; error?: string }> {
  const input = SendSchema.parse(raw);
  const me = await requireUserId();

  const thread = await prisma.messageThread.findUnique({ where: { id: input.threadId } });
  if (!thread) return { ok: false, error: "Conversation not found" };

  let fromParent: boolean;
  if (thread.parentUserId === me) {
    fromParent = true;
  } else {
    const staff = await prisma.schoolMembership.findFirst({
      where: { userId: me, schoolId: thread.schoolId, status: "active", role: { in: ["ADMIN", "TEACHER"] } },
    });
    if (!staff) return { ok: false, error: "Not authorized" };
    fromParent = false;
  }

  await prisma.message.create({ data: { threadId: thread.id, senderUserId: me, fromParent, body: input.body } });
  await prisma.messageThread.update({
    where: { id: thread.id },
    data: { lastMessageAt: new Date(), ...(fromParent ? {} : { staffUserId: me }) },
  });

  // Free web push to the parent when staff replies.
  if (!fromParent) {
    const push = await prisma.parentChannel.findFirst({
      where: { parentUserId: thread.parentUserId, type: "PUSH", optedIn: true },
    });
    if (push) {
      try {
        await sendWebPush(JSON.parse(push.address), { title: thread.subject, body: input.body, url: `/parent/messages?t=${thread.id}` });
      } catch {
        // best-effort
      }
    }
  }

  revalidatePath("/parent/messages");
  revalidatePath("/admin/messages");
  return { ok: true };
}

// Mark the other side's messages as read when a thread is opened.
export async function markThreadRead(threadId: string): Promise<{ ok: boolean }> {
  const me = await requireUserId();
  const thread = await prisma.messageThread.findUnique({ where: { id: threadId } });
  if (!thread) return { ok: false };

  const iAmParent = thread.parentUserId === me;
  if (!iAmParent) {
    const staff = await prisma.schoolMembership.findFirst({
      where: { userId: me, schoolId: thread.schoolId, status: "active", role: { in: ["ADMIN", "TEACHER"] } },
    });
    if (!staff) return { ok: false };
  }
  await prisma.message.updateMany({
    where: { threadId, fromParent: !iAmParent, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true };
}
