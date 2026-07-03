import { NextRequest, NextResponse } from "next/server";
import { sendDigest } from "@/lib/notifications/sendDigest";

export const dynamic = "force-dynamic";

// GET /api/digest — flushes the 17:00 absence digest (one summary per parent).
// Invoked by the Vercel cron at 16:00 UTC (= 17:00 Cameroon); can also be hit
// manually to demo the digest live. If CRON_SECRET is set, callers must present
// it (Vercel cron sends it as a Bearer token automatically); the operation is
// idempotent either way — it only ever flushes rows that are still QUEUED.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const key = req.nextUrl.searchParams.get("key");
    if (auth !== `Bearer ${secret}` && key !== secret) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const result = await sendDigest();
  return NextResponse.json({ ok: true, ...result, ranAt: new Date().toISOString() });
}
