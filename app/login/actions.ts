"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { phoneToAuthEmail, studentCodeToAuthEmail } from "@/lib/auth";

const Schema = z.object({
  phone: z.string().min(6).max(20),
  pin: z.string().regex(/^\d{5}$/),
});

const StudentSchema = z.object({
  code: z.string().trim().min(3).max(20),
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

  let dest = "/admin";
  if (user) {
    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isGovernment: true, isFlintAdmin: true },
    });
    if (me?.isGovernment) {
      dest = "/government";
    } else if (me?.isFlintAdmin) {
      dest = "/national";
    } else {
      const membership = await prisma.schoolMembership.findFirst({
        where: { userId: user.id, status: "active" },
      });
      if (membership?.role === "TEACHER") {
        dest = "/attendance";
      } else if (!membership) {
        const link = await prisma.parentLink.findFirst({
          where: { parentUserId: user.id, status: "active" },
        });
        if (link) dest = "/parent";
      }
    }
  }
  redirect(dest);
}

export async function signInStudent(input: { code: string; pin: string }): Promise<{ error: string } | void> {
  const parsed = StudentSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter your student code and 5-digit PIN." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: studentCodeToAuthEmail(parsed.data.code),
    password: parsed.data.pin,
  });
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
