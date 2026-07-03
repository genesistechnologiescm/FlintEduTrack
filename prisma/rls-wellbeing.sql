-- RLS for wellbeing snapshots: pastoral staff data — staff of the school only.
revoke all on "WellbeingSnapshot" from anon;
grant select, insert, update on "WellbeingSnapshot" to authenticated;

alter table "WellbeingSnapshot" enable row level security;

create policy wb_staff on "WellbeingSnapshot" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );
