"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { sendWebPush } from "@/lib/notifications/sendWebPush";

// Posting is open to active staff (admin or teacher) of the school.
async function staffContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const m = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, status: "active", role: { in: ["ADMIN", "TEACHER"] } },
  });
  if (!m) throw new Error("Not authorized");
  return { userId: user.id, schoolId: m.schoolId };
}

const PostSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(2000),
    audience: z.enum(["SCHOOL", "CLASS"]),
    classGroupId: z.string().uuid().optional(),
  })
  .refine((v) => v.audience !== "CLASS" || !!v.classGroupId, {
    message: "Pick a class",
    path: ["classGroupId"],
  });

// Distinct parents to notify, scoped to the school (or one class within it).
async function recipientParentIds(schoolId: string, audience: "SCHOOL" | "CLASS", classGroupId?: string): Promise<string[]> {
  if (audience === "CLASS" && classGroupId) {
    const enrollments = await prisma.enrollment.findMany({
      where: { classGroupId, schoolId, status: "ACTIVE" },
      select: { studentId: true },
    });
    const studentIds = enrollments.map((e) => e.studentId);
    if (studentIds.length === 0) return [];
    const links = await prisma.parentLink.findMany({
      where: { schoolId, status: "active", studentId: { in: studentIds } },
      select: { parentUserId: true },
      distinct: ["parentUserId"],
    });
    return links.map((l) => l.parentUserId);
  }
  const links = await prisma.parentLink.findMany({
    where: { schoolId, status: "active" },
    select: { parentUserId: true },
    distinct: ["parentUserId"],
  });
  return links.map((l) => l.parentUserId);
}

export async function postAnnouncement(raw: z.infer<typeof PostSchema>): Promise<{ ok: boolean; recipients: number; error?: string }> {
  const input = PostSchema.parse(raw);
  const { userId, schoolId } = await staffContext();

  if (input.audience === "CLASS" && input.classGroupId) {
    const klass = await prisma.classGroup.findFirst({ where: { id: input.classGroupId, schoolId } });
    if (!klass) return { ok: false, recipients: 0, error: "Class not in your school" };
  }

  const parentIds = await recipientParentIds(schoolId, input.audience, input.classGroupId);

  const announcement = await prisma.announcement.create({
    data: {
      schoolId,
      authorUserId: userId,
      audience: input.audience,
      classGroupId: input.audience === "CLASS" ? input.classGroupId : null,
      title: input.title,
      body: input.body,
    },
  });

  if (parentIds.length > 0) {
    await prisma.announcementReceipt.createMany({
      data: parentIds.map((parentUserId) => ({ announcementId: announcement.id, parentUserId })),
      skipDuplicates: true,
    });

    // Free web push to any parent who has subscribed their installed PWA.
    const channels = await prisma.parentChannel.findMany({
      where: { parentUserId: { in: parentIds }, type: "PUSH", optedIn: true },
    });
    await Promise.all(
      channels.map((ch) =>
        sendWebPush(JSON.parse(ch.address), { title: input.title, body: input.body, url: "/parent" }),
      ),
    );
  }

  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "announcement.posted",
    entityType: "Announcement",
    entityId: announcement.id,
    after: { title: input.title, audience: input.audience, recipients: parentIds.length },
  });
  revalidatePath("/admin/announcements");
  revalidatePath("/parent");
  return { ok: true, recipients: parentIds.length };
}
