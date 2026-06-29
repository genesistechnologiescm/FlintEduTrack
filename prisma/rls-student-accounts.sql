-- RLS for student self-accounts (run after `prisma db push`).
-- Helper is_school_staff exists from rls.sql.

revoke all on "StudentAccount" from anon;
grant select, insert, update, delete on "StudentAccount" to authenticated;

alter table "StudentAccount" enable row level security;

-- Staff manage their school's student accounts.
create policy stuacct_staff on "StudentAccount" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );

-- A student reads their own account row.
create policy stuacct_self on "StudentAccount" for select to authenticated
  using ( id = auth.uid()::text );
