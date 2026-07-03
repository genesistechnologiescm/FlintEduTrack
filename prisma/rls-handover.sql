-- RLS for handover notes: staff of the school only (internal operations data).
revoke all on "HandoverNote" from anon;
grant select, insert, update, delete on "HandoverNote" to authenticated;

alter table "HandoverNote" enable row level security;

create policy handover_staff on "HandoverNote" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );
