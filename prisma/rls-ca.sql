-- RLS for assessment components: staff of the school manage; nobody else reads.
revoke all on "AssessmentComponent" from anon;
grant select, insert, update, delete on "AssessmentComponent" to authenticated;

alter table "AssessmentComponent" enable row level security;

create policy ca_staff on "AssessmentComponent" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );
