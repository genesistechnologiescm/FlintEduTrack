-- RLS for the school calendar (run after `prisma db push`).
-- Adds a student_in_school helper (student self-accounts postdate rls.sql) so
-- students can read their school's rows on the PostgREST surface too.

create or replace function public.student_in_school(p_school text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from "StudentAccount" sa
    where sa.id = auth.uid()::text and sa."schoolId" = p_school and sa.status = 'active'
  );
$$;

revoke all on "CalendarEvent" from anon;
grant select, insert, update, delete on "CalendarEvent" to authenticated;

alter table "CalendarEvent" enable row level security;

-- Staff manage their school's calendar.
create policy cal_staff on "CalendarEvent" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );

-- Parents and students read their school's calendar.
create policy cal_parent_read on "CalendarEvent" for select to authenticated
  using ( parent_in_school("schoolId") );
create policy cal_student_read on "CalendarEvent" for select to authenticated
  using ( student_in_school("schoolId") );
