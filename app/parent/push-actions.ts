"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

// Stores the browser's push subscription as a PUSH ParentChannel for the
// logged-in user. One push channel per parent (latest device wins).
export async function savePushSubscription(raw: unknown): Promise<{ ok: boolean }> {
  const sub = Schema.parse(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const address = JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys });
  const existing = await prisma.parentChannel.findFirst({
    where: { parentUserId: user.id, type: "PUSH" },
  });
  if (existing) {
    await prisma.parentChannel.update({
      where: { id: existing.id },
      data: { address, optedIn: true, verified: true, status: "ACTIVE" },
    });
  } else {
    await prisma.parentChannel.create({
      data: { parentUserId: user.id, type: "PUSH", address, optedIn: true, verified: true },
    });
  }
  return { ok: true };
}
