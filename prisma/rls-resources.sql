-- RLS for the e-learning resource table (run after `prisma db push`).
-- Helpers (is_school_staff, parent_in_school) already exist from rls.sql.
-- The app reaches this via Prisma (owner, bypasses RLS); this hardens the
-- anon/authenticated PostgREST surface (defense in depth).

revoke all on "LessonResource" from anon;
grant select, insert, update, delete on "LessonResource" to authenticated;

alter table "LessonResource" enable row level security;

-- School staff create/manage their school's resources.
create policy resource_staff on "LessonResource" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );

-- Parents read resources in any school where they have a child (lessons are not PII).
create policy resource_parent on "LessonResource" for select to authenticated
  using ( parent_in_school("schoolId") );
