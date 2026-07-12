-- RLS for NationalEvent: national exam dates are public information (they are
-- published in newspapers), so anyone may READ non-deleted rows. Nobody writes
-- through the API surface: mutations happen only via server actions running on
-- the owner connection (which bypasses RLS) after an isGovernment check.
ALTER TABLE "NationalEvent" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS national_events_public_read ON "NationalEvent";
CREATE POLICY national_events_public_read ON "NationalEvent"
  FOR SELECT
  TO anon, authenticated
  USING ("deletedAt" IS NULL);
