"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_POLICY_VERSION } from "@/lib/privacyPolicy";

// A guardian acknowledges the privacy notice once (per policy version). Recorded
// as their own present-user consent — not an attestation made on their behalf.
export async function recordGuardianConsent(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const existing = await prisma.consent.findFirst({
    where: { scope: "GUARDIAN", userId: user.id, policyVersion: CURRENT_POLICY_VERSION },
  });
  if (!existing) {
    await prisma.consent.create({
      data: { scope: "GUARDIAN", userId: user.id, policyVersion: CURRENT_POLICY_VERSION, grantedByUserId: user.id },
    });
  }
  revalidatePath("/parent");
  return { ok: true };
}
