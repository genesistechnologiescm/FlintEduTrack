-- RLS for the grade-correction workflow (run after `prisma db push`).
-- Helper is_school_staff exists from rls.sql. Corrections are a staff-only
-- surface: teachers create requests, admins decide; parents/students never
-- read them directly (they see the resulting grade).

revoke all on "GradeCorrection" from anon;
grant select, insert, update, delete on "GradeCorrection" to authenticated;

alter table "GradeCorrection" enable row level security;

create policy gradecorr_staff on "GradeCorrection" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );
