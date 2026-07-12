"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

// The Flint approval gate for ministry notices: only isFlintAdmin may publish
// or reject a PENDING_REVIEW national notice. Decisions are audited with the
// reviewer stamped on the row.
const ReviewSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
});

export async function reviewNationalNotice(raw: z.infer<typeof ReviewSchema>): Promise<{ ok: boolean; error?: string }> {
  const input = ReviewSchema.parse(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { isFlintAdmin: true } });
  if (!me?.isFlintAdmin) throw new Error("Not authorized");

  const notice = await prisma.announcement.findFirst({
    where: { id: input.id, audience: "NATIONAL", status: "PENDING_REVIEW", deletedAt: null },
  });
  if (!notice) return { ok: false, error: "Not found or already reviewed" };

  const status = input.decision === "approve" ? "PUBLISHED" : "REJECTED";
  await prisma.announcement.update({
    where: { id: notice.id },
    data: { status, reviewedBy: user.id, reviewedAt: new Date() },
  });
  await writeAudit({
    actorUserId: user.id,
    action: input.decision === "approve" ? "noticeboard.approved" : "noticeboard.rejected",
    entityType: "Announcement",
    entityId: notice.id,
    before: { title: notice.title, status: "PENDING_REVIEW" },
    after: { status },
  });
  revalidatePath("/noticeboard");
  revalidatePath("/government/noticeboard");
  return { ok: true };
}
