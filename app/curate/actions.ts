"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

// National-shelf curation is a PLATFORM power: Flint admins only (isFlintAdmin),
// not school admins — one curator standard for the whole country.
async function curatorContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const me = await prisma.user.findUnique({ where: { id: user.id } });
  if (!me?.isFlintAdmin) throw new Error("Not authorized");
  return { userId: user.id };
}

const IdSchema = z.string().uuid();

export async function approveLibraryItem(rawId: string): Promise<{ ok: boolean; error?: string }> {
  const id = IdSchema.parse(rawId);
  const { userId } = await curatorContext();
  const item = await prisma.libraryItem.findFirst({ where: { id, status: "PENDING", deletedAt: null } });
  if (!item) return { ok: false, error: "Not found or already decided" };

  await prisma.libraryItem.update({ where: { id }, data: { status: "APPROVED" } });
  await writeAudit({
    schoolId: item.schoolId,
    actorUserId: userId,
    action: "library.approved",
    entityType: "LibraryItem",
    entityId: id,
    after: { title: item.title },
  });
  revalidatePath("/library");
  revalidatePath("/curate");
  return { ok: true };
}

export async function rejectLibraryItem(rawId: string): Promise<{ ok: boolean; error?: string }> {
  const id = IdSchema.parse(rawId);
  const { userId } = await curatorContext();
  const item = await prisma.libraryItem.findFirst({ where: { id, status: "PENDING", deletedAt: null } });
  if (!item) return { ok: false, error: "Not found or already decided" };

  await prisma.libraryItem.update({ where: { id }, data: { status: "REJECTED" } });
  await writeAudit({
    schoolId: item.schoolId,
    actorUserId: userId,
    action: "library.rejected",
    entityType: "LibraryItem",
    entityId: id,
    after: { title: item.title },
  });
  revalidatePath("/curate");
  return { ok: true };
}
