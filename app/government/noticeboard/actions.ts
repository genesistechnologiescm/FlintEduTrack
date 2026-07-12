"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

// National notices are posted by the ministry (isGovernment) or Flint
// (isFlintAdmin). Ministry posts start PENDING_REVIEW — Flint approves before
// the country sees them (the "posts → all schools + Flint approval" spec).
// Flint's own posts publish immediately. No push/receipt fanout in v1: the
// board is the surface (fanout is a later Router activation).
async function posterContext(): Promise<{ userId: string; isFlint: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isGovernment: true, isFlintAdmin: true },
  });
  if (!me || (!me.isGovernment && !me.isFlintAdmin)) throw new Error("Not authorized");
  return { userId: user.id, isFlint: me.isFlintAdmin };
}

const PostSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
});

export async function postNationalNotice(raw: z.infer<typeof PostSchema>): Promise<{ ok: boolean; pending: boolean; error?: string }> {
  const input = PostSchema.parse(raw);
  const { userId, isFlint } = await posterContext();

  const notice = await prisma.announcement.create({
    data: {
      schoolId: null,
      authorUserId: userId,
      audience: "NATIONAL",
      status: isFlint ? "PUBLISHED" : "PENDING_REVIEW",
      title: input.title,
      body: input.body,
      reviewedBy: isFlint ? userId : null,
      reviewedAt: isFlint ? new Date() : null,
    },
  });
  await writeAudit({
    actorUserId: userId,
    action: "noticeboard.posted",
    entityType: "Announcement",
    entityId: notice.id,
    after: { title: input.title, status: notice.status },
  });
  revalidatePath("/government/noticeboard");
  revalidatePath("/noticeboard");
  return { ok: true, pending: !isFlint };
}

const RemoveSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().min(3).max(300),
});

export async function removeNationalNotice(raw: z.infer<typeof RemoveSchema>): Promise<{ ok: boolean; error?: string }> {
  const input = RemoveSchema.parse(raw);
  const { userId, isFlint } = await posterContext();

  const notice = await prisma.announcement.findFirst({
    where: { id: input.id, audience: "NATIONAL", deletedAt: null },
  });
  if (!notice) return { ok: false, error: "Not found" };
  // The ministry may remove its own notices; Flint may remove any.
  if (!isFlint && notice.authorUserId !== userId) return { ok: false, error: "Not authorized" };

  await prisma.announcement.update({
    where: { id: notice.id },
    data: { deletedAt: new Date(), deleteReason: input.reason },
  });
  await writeAudit({
    actorUserId: userId,
    action: "noticeboard.removed",
    entityType: "Announcement",
    entityId: notice.id,
    before: { title: notice.title, status: notice.status },
    reason: input.reason,
  });
  revalidatePath("/government/noticeboard");
  revalidatePath("/noticeboard");
  return { ok: true };
}
