"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { phoneToAuthEmail } from "@/lib/auth";

const Schema = z.object({
  phone: z.string().min(6).max(20),
  pin: z.string().regex(/^\d{5}$/),
});

export async function signIn(input: { phone: string; pin: string }): Promise<{ error: string } | void> {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { error: "Enter your phone number and 5-digit PIN." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: phoneToAuthEmail(parsed.data.phone),
    password: parsed.data.pin,
  });
  if (error) return { error: "Wrong phone number or PIN." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dest = "/admin";
  if (user) {
    const membership = await prisma.schoolMembership.findFirst({
      where: { userId: user.id, status: "active" },
    });
    if (membership?.role === "TEACHER") dest = "/attendance";
  }
  redirect(dest);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
