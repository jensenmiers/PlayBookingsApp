-- Allow public SELECT access to active venues
-- This policy allows anyone (including unauthenticated users) to view venues where is_active = true
CREATE POLICY "Public can view active venues"
ON venues
FOR SELECT
TO public
USING (is_active = true);;
