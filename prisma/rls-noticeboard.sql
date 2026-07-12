-- RLS for the national noticeboard: PUBLISHED national notices are public
-- information (they are circulars posted on physical boards), so anyone may
-- read them. Pending/rejected national notices stay invisible to the API
-- surface: review happens through server actions on the owner connection
-- (which bypasses RLS) behind isFlintAdmin checks. School/class announcement
-- policies from rls-announcements.sql are unchanged and only ever matched
-- rows with a schoolId, so making schoolId nullable does not widen them.
DROP POLICY IF EXISTS national_notices_public_read ON "Announcement";
CREATE POLICY national_notices_public_read ON "Announcement"
  FOR SELECT
  TO anon, authenticated
  USING (audience = 'NATIONAL' AND status = 'PUBLISHED' AND "deletedAt" IS NULL);
