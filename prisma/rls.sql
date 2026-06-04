-- EduTrack — Row-Level Security (Phase 1)
-- Applied after `prisma db push`. Enforces the privacy moat at the database.
-- Column/table names are PascalCase/camelCase (Prisma default) -> must be quoted.
-- auth.uid() returns uuid; our id columns are text -> cast auth.uid()::text.
-- Table OWNER (postgres / Prisma server connection) bypasses RLS by design;
-- the anon + authenticated API roles are fully governed by these policies.

-- ─────────────── Lock the public API surface ───────────────
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ─────────────── Helper functions (SECURITY DEFINER) ───────────────
create or replace function public.is_school_staff(p_school text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from "SchoolMembership" m
    where m."userId" = auth.uid()::text and m."schoolId" = p_school and m.status = 'active'
  );
$$;

create or replace function public.is_school_admin(p_school text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from "SchoolMembership" m
    where m."userId" = auth.uid()::text and m."schoolId" = p_school
      and m.role::text = 'ADMIN' and m.status = 'active'
  );
$$;

create or replace function public.parent_linked(p_student text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from "ParentLink" pl
    where pl."parentUserId" = auth.uid()::text and pl."studentId" = p_student and pl.status = 'active'
  );
$$;

create or replace function public.parent_in_school(p_school text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from "ParentLink" pl
    join "Enrollment" e on e."studentId" = pl."studentId"
    where pl."parentUserId" = auth.uid()::text and pl.status = 'active' and e."schoolId" = p_school
  );
$$;

-- ─────────────── Enable RLS on every table ───────────────
alter table "User"                 enable row level security;
alter table "School"               enable row level security;
alter table "SchoolMembership"     enable row level security;
alter table "AcademicYear"         enable row level security;
alter table "Term"                 enable row level security;
alter table "ClassGroup"           enable row level security;
alter table "Subject"              enable row level security;
alter table "TimetableSlot"        enable row level security;
alter table "Student"              enable row level security;
alter table "Enrollment"           enable row level security;
alter table "ParentLink"           enable row level security;
alter table "AbsenceAuthorisation" enable row level security;
alter table "AttendanceSession"    enable row level security;
alter table "AttendanceRecord"     enable row level security;
alter table "WelfareCase"          enable row level security;
alter table "WelfareEvent"         enable row level security;
alter table "SuspensionLog"        enable row level security;
alter table "ParentChannel"        enable row level security;
alter table "NotificationLog"      enable row level security;
alter table "AuditLog"             enable row level security;
alter table "ConflictLog"          enable row level security;
alter table "AuthDevice"           enable row level security;
alter table "AuthAttempt"          enable row level security;

-- ─────────────── Policies ───────────────
-- USER: see/update yourself
create policy user_self on "User" for select to authenticated
  using ( id = auth.uid()::text );
create policy user_self_upd on "User" for update to authenticated
  using ( id = auth.uid()::text ) with check ( id = auth.uid()::text );

-- SCHOOL: staff of the school, or a parent with a child enrolled there
create policy school_read on "School" for select to authenticated
  using ( is_school_staff(id) or parent_in_school(id) );

-- SCHOOL MEMBERSHIP: see your own; admins manage their school's
create policy membership_self on "SchoolMembership" for select to authenticated
  using ( "userId" = auth.uid()::text or is_school_admin("schoolId") );
create policy membership_admin on "SchoolMembership" for all to authenticated
  using ( is_school_admin("schoolId") ) with check ( is_school_admin("schoolId") );

-- ACADEMIC YEAR / TERM: staff only
create policy year_staff on "AcademicYear" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );
create policy term_staff on "Term" for all to authenticated
  using ( exists (select 1 from "AcademicYear" ay where ay.id = "Term"."academicYearId" and is_school_staff(ay."schoolId")) )
  with check ( exists (select 1 from "AcademicYear" ay where ay.id = "Term"."academicYearId" and is_school_staff(ay."schoolId")) );

-- CLASS / SUBJECT / TIMETABLE: staff manage; parents in the school can read
create policy class_staff on "ClassGroup" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );
create policy class_parent on "ClassGroup" for select to authenticated
  using ( parent_in_school("schoolId") );
create policy subject_staff on "Subject" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );
create policy subject_parent on "Subject" for select to authenticated
  using ( parent_in_school("schoolId") );
create policy slot_staff on "TimetableSlot" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );
create policy slot_parent on "TimetableSlot" for select to authenticated
  using ( parent_in_school("schoolId") );

-- STUDENT: linked parent, or staff at a school where the student is enrolled
create policy student_parent on "Student" for select to authenticated
  using ( parent_linked(id) );
create policy student_staff on "Student" for all to authenticated
  using ( exists (select 1 from "Enrollment" e where e."studentId" = "Student".id and is_school_staff(e."schoolId")) )
  with check ( exists (select 1 from "Enrollment" e where e."studentId" = "Student".id and is_school_staff(e."schoolId")) );

-- ENROLLMENT
create policy enroll_staff on "Enrollment" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );
create policy enroll_parent on "Enrollment" for select to authenticated
  using ( parent_linked("studentId") );

-- PARENT LINK: your own links; school staff manage their school's
create policy link_owner on "ParentLink" for select to authenticated
  using ( "parentUserId" = auth.uid()::text );
create policy link_staff on "ParentLink" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );

-- ABSENCE AUTHORISATION
create policy auth_staff on "AbsenceAuthorisation" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );
create policy auth_parent on "AbsenceAuthorisation" for select to authenticated
  using ( parent_linked("studentId") );

-- ATTENDANCE SESSION: staff of the session's school; parent if their child is in it
create policy sess_staff on "AttendanceSession" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );
create policy sess_parent on "AttendanceSession" for select to authenticated
  using ( exists (select 1 from "AttendanceRecord" r where r."sessionId" = "AttendanceSession".id and parent_linked(r."studentId")) );

-- ATTENDANCE RECORD: staff via session school; parent for their linked child
create policy rec_staff on "AttendanceRecord" for all to authenticated
  using ( exists (select 1 from "AttendanceSession" s where s.id = "AttendanceRecord"."sessionId" and is_school_staff(s."schoolId")) )
  with check ( exists (select 1 from "AttendanceSession" s where s.id = "AttendanceRecord"."sessionId" and is_school_staff(s."schoolId")) );
create policy rec_parent on "AttendanceRecord" for select to authenticated
  using ( parent_linked("studentId") );

-- WELFARE: STAFF ONLY. No parent policy exists -> parents get zero rows.
create policy welfare_staff on "WelfareCase" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );
create policy welfareevt_staff on "WelfareEvent" for all to authenticated
  using ( exists (select 1 from "WelfareCase" c where c.id = "WelfareEvent"."welfareCaseId" and is_school_staff(c."schoolId")) )
  with check ( exists (select 1 from "WelfareCase" c where c.id = "WelfareEvent"."welfareCaseId" and is_school_staff(c."schoolId")) );
create policy suspension_staff on "SuspensionLog" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );

-- NOTIFICATIONS: a user manages their own channels; sees their own send log
create policy channel_owner on "ParentChannel" for all to authenticated
  using ( "parentUserId" = auth.uid()::text ) with check ( "parentUserId" = auth.uid()::text );
create policy notif_owner on "NotificationLog" for select to authenticated
  using ( "parentUserId" = auth.uid()::text );

-- AUDIT: school admins read their school's audit trail
create policy audit_admin on "AuditLog" for select to authenticated
  using ( "schoolId" is not null and is_school_admin("schoolId") );

-- CONFLICT: surfaced to the affected user
create policy conflict_owner on "ConflictLog" for select to authenticated
  using ( "affectedUserId" = auth.uid()::text );

-- AUTH DEVICE: your own devices
create policy device_owner on "AuthDevice" for all to authenticated
  using ( "userId" = auth.uid()::text ) with check ( "userId" = auth.uid()::text );

-- AuthAttempt: RLS enabled, NO policy -> only the server (owner/service) can touch it.
