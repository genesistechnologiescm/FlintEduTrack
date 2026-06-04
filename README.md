# EduTrack — app

Flint Technologies · Product #1 · national school platform for Cameroon.
**Phase 1:** attendance · parent alerts · admin dashboard · welfare escalation · auth.

## Stack
Next.js 15 · TypeScript · Tailwind v4 · Prisma (PostgreSQL via Supabase) · @supabase/ssr · Zod

## Setup (local)
1. `npm install`
2. Create the env files (see `.env.example`):
   - `.env` — `DATABASE_URL`, `DIRECT_URL` (Prisma, Supabase pooler)
   - `.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. `npm run db:push` — create the 23 tables
4. Apply RLS (privacy moat):
   `npx prisma db execute --url "<DIRECT_URL>" --file prisma/rls.sql`
5. `npm run db:seed` — demo school + 35 students + provisioned logins
6. `npm run db:seed:history` — attendance history (populates the welfare at-risk list)
7. `npm run dev` → http://localhost:3000

## Demo logins
| Role | Phone | PIN |
|---|---|---|
| Admin | +237670000000 | 12345 |
| Teacher | +237670000001 | 12345 |

## Scripts
`dev` · `build` · `start` · `lint` · `db:push` · `db:seed` · `db:seed:history` · `db:studio` · `db:generate`

## Deploy (Vercel)
1. Push to GitHub, import the repo into Vercel (framework auto-detected as Next.js).
2. Set env vars in the Vercel dashboard: `DATABASE_URL`, `DIRECT_URL`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Build runs `prisma generate` (postinstall) + `next build`.

## Notes
- **Node 20:** `instrumentation.ts` polyfills a global `WebSocket` (via `ws`) for
  `@supabase/supabase-js`. Remove after upgrading to **Node 22 LTS** (then move to
  Next 16 / Prisma 7).
- **Security posture & pre-launch gate:** `../Architecture/08_Security.md`
  (rotate secrets + run a security review before any real data).
- Architecture docs: `../Architecture/` · working docs: `../README.md`
