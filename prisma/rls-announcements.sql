-- RLS for the messaging tables (run after `prisma db push` adds them).
-- Helper functions (is_school_staff) already exist from rls.sql.
-- Note: the app reaches these tables only via Prisma (owner, bypasses RLS);
-- these policies harden the anon/authenticated PostgREST surface (defense in depth).

revoke all on "Announcement" from anon;
revoke all on "AnnouncementReceipt" from anon;
grant select, insert, update, delete on "Announcement" to authenticated;
grant select, insert, update, delete on "AnnouncementReceipt" to authenticated;

alter table "Announcement" enable row level security;
alter table "AnnouncementReceipt" enable row level security;

-- School staff manage their own school's announcements.
create policy ann_staff on "Announcement" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );

-- Parents read announcements addressed to them (they hold a receipt).
create policy ann_parent_read on "Announcement" for select to authenticated
  using (
    exists (
      select 1 from "AnnouncementReceipt" r
      where r."announcementId" = "Announcement".id
        and r."parentUserId" = auth.uid()::text
    )
  );

-- The owning parent reads/updates their own receipt (e.g. mark as read).
create policy ann_receipt_parent on "AnnouncementReceipt" for all to authenticated
  using ( "parentUserId" = auth.uid()::text )
  with check ( "parentUserId" = auth.uid()::text );

-- Staff of the announcement's school manage its receipts.
create policy ann_receipt_staff on "AnnouncementReceipt" for all to authenticated
  using (
    exists (
      select 1 from "Announcement" a
      where a.id = "AnnouncementReceipt"."announcementId"
        and is_school_staff(a."schoolId")
    )
  );
