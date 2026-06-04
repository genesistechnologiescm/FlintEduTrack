import { PrismaClient } from "@prisma/client";

// Prisma connects as the DB owner → bypasses RLS by design. Use ONLY in trusted
// server code that performs its own authorization. User-facing reads that must
// respect RLS go through the Supabase client (lib/supabase) instead.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
