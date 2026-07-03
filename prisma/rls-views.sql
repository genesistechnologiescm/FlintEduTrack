-- RLS for resource views: telemetry is server-written; staff of the resource's
-- school may read aggregates. No client writes.
revoke all on "ResourceView" from anon;
grant select on "ResourceView" to authenticated;

alter table "ResourceView" enable row level security;

create policy views_staff_read on "ResourceView" for select to authenticated
  using (
    exists (
      select 1 from "LessonResource" lr
      where lr.id = "ResourceView"."resourceId" and is_school_staff(lr."schoolId")
    )
  );
