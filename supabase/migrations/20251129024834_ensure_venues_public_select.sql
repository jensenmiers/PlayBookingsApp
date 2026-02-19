-- Ensure venues public select policy exists (drop if exists, then recreate)
DROP POLICY IF EXISTS "Public can view active venues" ON venues;

-- Allow anyone to view active venues (no auth required)
CREATE POLICY "Public can view active venues"
ON venues
FOR SELECT
TO anon, authenticated
USING (is_active = true);;
