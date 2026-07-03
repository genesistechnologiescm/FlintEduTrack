import { NextRequest, NextResponse } from "next/server";
import { handleUssd } from "@/lib/notifications/ussd";

export const dynamic = "force-dynamic";

// USSD gateway callback — speaks the Africa's Talking contract:
// POST form fields sessionId, serviceCode, phoneNumber, text → plain-text
// "CON ..." / "END ...". ACTIVATION = paste this URL into the aggregator's
// dashboard; nothing else changes. If USSD_SECRET is set, callers must present
// it (?key= or Authorization) — demo keeps it open on synthetic data.
function guarded(req: NextRequest): boolean {
  const secret = process.env.USSD_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}` || req.nextUrl.searchParams.get("key") === secret;
}

export async function POST(req: NextRequest) {
  if (!guarded(req)) return new NextResponse("Unauthorized", { status: 401 });
  const form = await req.formData().catch(() => null);
  const phone = String(form?.get("phoneNumber") ?? "");
  const text = String(form?.get("text") ?? "");
  if (!phone) return new NextResponse("END Missing phoneNumber", { headers: { "Content-Type": "text/plain" } });
  const reply = await handleUssd(phone, text);
  return new NextResponse(reply, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

// GET variant for manual testing: /api/ussd?phone=+237...&text=1
export async function GET(req: NextRequest) {
  if (!guarded(req)) return new NextResponse("Unauthorized", { status: 401 });
  const phone = req.nextUrl.searchParams.get("phone") ?? "";
  const text = req.nextUrl.searchParams.get("text") ?? "";
  if (!phone) return new NextResponse("END Missing phone", { headers: { "Content-Type": "text/plain" } });
  const reply = await handleUssd(phone, text);
  return new NextResponse(reply, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
