"use server";

import { z } from "zod";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { getStudentBalance } from "@/lib/feeBalance";

const PaySchema = z.object({
  studentId: z.string().uuid(),
  amount: z.coerce.number().int().min(1).max(100_000_000),
  momoNumber: z.string().trim().min(6).max(20),
});

// MOCKED Mobile Money payment — records the transaction with a fake reference.
// No real funds move and no PSP is contacted. Real MTN/Orange MoMo is a post-win swap.
export async function payFees(raw: z.infer<typeof PaySchema>): Promise<{ ok: boolean; reference?: string; paymentId?: string; amount?: number; newBalance?: number; error?: string }> {
  const input = PaySchema.parse(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const link = await prisma.parentLink.findFirst({
    where: { parentUserId: user.id, studentId: input.studentId, status: "active" },
  });
  if (!link) return { ok: false, error: "Not your child" };

  const reference = `MOMO-${randomBytes(4).toString("hex").toUpperCase()}`;
  const payment = await prisma.payment.create({
    data: {
      schoolId: link.schoolId,
      studentId: input.studentId,
      amount: input.amount,
      method: "MOMO",
      reference,
      paidByUserId: user.id,
      note: `Mock MoMo from ${input.momoNumber}`,
    },
  });
  await writeAudit({
    schoolId: link.schoolId,
    actorUserId: user.id,
    action: "payment.recorded",
    entityType: "Payment",
    entityId: reference,
    after: { studentId: input.studentId, amount: input.amount, method: "MOMO", mock: true },
  });

  const { balance } = await getStudentBalance(input.studentId);
  revalidatePath("/parent/fees");
  revalidatePath("/admin/fees");
  return { ok: true, reference, paymentId: payment.id, amount: input.amount, newBalance: balance };
}
