-- RLS for gate check-ins. Staff read their school's; a user may insert only
-- their OWN check-in (server writes via Prisma bypass anyway; defense-in-depth).
revoke all on "GateCheckIn" from anon;
grant select, insert on "GateCheckIn" to authenticated;

alter table "GateCheckIn" enable row level security;

create policy gate_staff_read on "GateCheckIn" for select to authenticated
  using ( is_school_staff("schoolId") );

create policy gate_self_insert on "GateCheckIn" for insert to authenticated
  with check ( is_school_staff("schoolId") and "userId" = auth.uid()::text );
