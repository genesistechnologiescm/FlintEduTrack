-- RLS for the digital library (run after `prisma db push`).
-- Read-only shared shelf: every authenticated user (student, parent, staff)
-- may read; there are deliberately NO insert/update/delete policies — writes
-- happen only through the server's owner connection (curated content).

revoke all on "LibraryItem" from anon;
grant select on "LibraryItem" to authenticated;

alter table "LibraryItem" enable row level security;

create policy library_read on "LibraryItem" for select to authenticated
  using ( "deletedAt" IS NULL );
