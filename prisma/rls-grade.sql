-- RLS for the Grade table (run after `prisma db push` adds it).
-- Helper functions (is_school_staff, parent_linked) already exist from rls.sql.
revoke all on "Grade" from anon;
grant select, insert, update, delete on "Grade" to authenticated;

alter table "Grade" enable row level security;

-- School staff manage their school's grades.
create policy grade_staff on "Grade" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );

-- Parents read grades for their linked children only.
create policy grade_parent on "Grade" for select to authenticated
  using ( parent_linked("studentId") );
