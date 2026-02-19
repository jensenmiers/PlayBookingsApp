-- Drop existing public select policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Public can view active venues" ON public.venues;
DROP POLICY IF EXISTS "venues_public_select" ON public.venues;
DROP POLICY IF EXISTS "Allow public read access to active venues" ON public.venues;

-- Create a policy allowing anyone (authenticated or anonymous) to SELECT active venues
CREATE POLICY "Allow public read access to active venues"
ON public.venues
FOR SELECT
TO public
USING (is_active = true);;
