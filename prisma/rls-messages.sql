-- RLS for the parent↔staff messaging tables (run after `prisma db push`).
-- Helper functions (is_school_staff) already exist from rls.sql.
-- The app reaches these via Prisma (owner, bypasses RLS); these policies harden
-- the anon/authenticated PostgREST surface (defense in depth).

revoke all on "MessageThread" from anon;
revoke all on "Message" from anon;
grant select, insert, update, delete on "MessageThread" to authenticated;
grant select, insert, update, delete on "Message" to authenticated;

alter table "MessageThread" enable row level security;
alter table "Message" enable row level security;

-- A parent sees/manages their own threads; staff manage their school's threads.
create policy thread_parent on "MessageThread" for all to authenticated
  using ( "parentUserId" = auth.uid()::text )
  with check ( "parentUserId" = auth.uid()::text );

create policy thread_staff on "MessageThread" for all to authenticated
  using ( is_school_staff("schoolId") )
  with check ( is_school_staff("schoolId") );

-- Messages: visible to the thread's parent and to staff of the thread's school.
create policy msg_parent on "Message" for all to authenticated
  using (
    exists (
      select 1 from "MessageThread" t
      where t.id = "Message"."threadId" and t."parentUserId" = auth.uid()::text
    )
  );

create policy msg_staff on "Message" for all to authenticated
  using (
    exists (
      select 1 from "MessageThread" t
      where t.id = "Message"."threadId" and is_school_staff(t."schoolId")
    )
  );
