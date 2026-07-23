"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isDemoMode } from "@/lib/demoMode";
import { normalizeCmPhone, phoneToAuthEmail, studentCodeToAuthEmail } from "@/lib/auth";

// ── Brute-force protection (security review #4) ─────────────────────────────
// A 5-digit PIN is ~100k combinations; GoTrue's per-endpoint limits are the
// baseline, this adds an app-level lock per identifier and per IP.
const WINDOW_MIN = 15;
const MAX_ID_FAILS = 5;
const MAX_IP_FAILS = 20;
const LOCK_MSG = "Too many failed attempts. Please wait 15 minutes and try again.";

async function clientIp(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : null;
}

// Fail-open: the rate limiter must never be the thing that takes login down.
async function isLocked(identifier: string, ip: string | null): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MIN * 60_000);
  try {
    const [idFails, ipFails] = await Promise.all([
      prisma.authAttempt.count({ where: { phone: identifier, success: false, at: { gte: since } } }),
      ip ? prisma.authAttempt.count({ where: { ip, success: false, at: { gte: since } } }) : Promise.resolve(0),
    ]);
    return idFails >= MAX_ID_FAILS || ipFails >= MAX_IP_FAILS;
  } catch {
    return false;
  }
}

async function recordAttempt(identifier: string, ip: string | null, kind: string, success: boolean): Promise<void> {
  try {
    await prisma.authAttempt.create({ data: { phone: identifier, ip, kind, success } });
  } catch {
    // best-effort — never block login on logging
  }
}

const Schema = z.object({
  // Accepts local ("6XX XXX XXX") and full ("+237 6XX XXX XXX") entry; must
  // contain enough digits to be a phone at all before we hit the auth server.
  phone: z
    .string()
    .min(6)
    .max(20)
    .refine((p) => p.replace(/\D/g, "").length >= 6, "Enter a valid phone number"),
  pin: z.string().regex(/^\d{5}$/),
});

const StudentSchema = z.object({
  code: z.string().trim().min(3).max(20),
  pin: z.string().regex(/^\d{5}$/),
});

export async function signIn(input: { phone: string; pin: string }): Promise<{ error: string } | void> {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { error: "Enter your phone number and 5-digit PIN." };

  // Normalized so "6XX XXX XXX" and "+237 6XX XXX XXX" share one rate-limit bucket.
  const identifier = normalizeCmPhone(parsed.data.phone);
  const ip = await clientIp();
  if (await isLocked(identifier, ip)) return { error: LOCK_MSG };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: phoneToAuthEmail(parsed.data.phone),
    password: parsed.data.pin,
  });
  await recordAttempt(identifier, ip, "staff_parent_pin", !error);
  if (error) {
    const unreachable = error.status === 0 || /fetch failed|network/i.test(error.message);
    return {
      error: unreachable
        ? "Couldn't reach the server. Check your connection and try again."
        : "Wrong phone number or PIN.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Still on the admin-issued temporary PIN → set your own before anything else.
  if (user?.user_metadata?.must_change_pin === true && !isDemoMode()) redirect("/set-pin");

  // Land the user on THEIR home. Priority: the person's school job first — a
  // school admin who also helps curate the national library is still, first, a
  // school admin (the old order let isFlintAdmin hijack the principal's login
  // to /national). Platform flags only route people with no school role, and
  // the fallback is /parent, which renders a friendly empty state instead of
  // bouncing back to /login the way /admin's authz gate would.
  let dest = "/parent";
  if (user) {
    try {
      const [me, membership] = await Promise.all([
        prisma.user.findUnique({
          where: { id: user.id },
          select: { isGovernment: true, isFlintAdmin: true },
        }),
        prisma.schoolMembership.findFirst({
          where: { userId: user.id, status: "active" },
          orderBy: { role: "asc" }, // ADMIN sorts before TEACHER on dual memberships
        }),
      ]);
      if (me?.isGovernment) dest = "/government";
      else if (membership?.role === "ADMIN") dest = "/admin";
      else if (membership?.role === "TEACHER") dest = "/attendance";
      else if (me?.isFlintAdmin) dest = "/flint";
    } catch {
      // DB blip mid-login: keep the safe fallback rather than a 500. The
      // session is already set, so the user can navigate from /parent.
    }
  }
  redirect(dest);
}

export async function signInStudent(input: { code: string; pin: string }): Promise<{ error: string } | void> {
  const parsed = StudentSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter your student code and 5-digit PIN." };

  const identifier = `code:${parsed.data.code.toUpperCase().replace(/[^A-Z0-9]/g, "")}`;
  const ip = await clientIp();
  if (await isLocked(identifier, ip)) return { error: LOCK_MSG };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: studentCodeToAuthEmail(parsed.data.code),
    password: parsed.data.pin,
  });
  await recordAttempt(identifier, ip, "student_pin", !error);
  if (error) {
    const unreachable = error.status === 0 || /fetch failed|network/i.test(error.message);
    return {
      error: unreachable
        ? "Couldn't reach the server. Check your connection and try again."
        : "Wrong student code or PIN.",
    };
  }
  redirect("/student");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
