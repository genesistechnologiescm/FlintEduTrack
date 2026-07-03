-- Library RLS v2 (contribution pipeline). Replaces the v1 read policy:
-- readers see only APPROVED items; a contributor may also see their own
-- pending/rejected submissions. Writes remain server-side only (no policies).

drop policy if exists library_read on "LibraryItem";

create policy library_read on "LibraryItem" for select to authenticated
  using (
    "deletedAt" IS NULL
    and ( status = 'APPROVED' or "createdBy" = auth.uid()::text )
  );
