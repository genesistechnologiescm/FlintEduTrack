-- RLS for the fees/payments tables (run after `prisma db push`).
-- Helpers (is_school_staff, parent_in_school, parent_linked) exist from rls.sql.
-- The app reaches these via Prisma (owner, bypasses RLS); this hardens the
-- anon/authenticated PostgREST surface (defense in depth).

revoke all on "FeeItem" from anon;
revoke all on "Payment" from anon;
grant select, insert, update, delete on "FeeItem" to authenticated;
grant select, insert, update, delete on "Payment" to authenticated;

alter table "FeeItem" enable row level security;
alter table "Payment" enable row level security;

-- Fee items: staff manage their school's; parents read fees in their school.
create policy fee_staff on "FeeItem" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );
create policy fee_parent_read on "FeeItem" for select to authenticated
  using ( parent_in_school("schoolId") );

-- Payments: staff manage their school's; parents read + record payments for their
-- own linked children only.
create policy payment_staff on "Payment" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );
create policy payment_parent on "Payment" for all to authenticated
  using ( parent_linked("studentId") ) with check ( parent_linked("studentId") );
