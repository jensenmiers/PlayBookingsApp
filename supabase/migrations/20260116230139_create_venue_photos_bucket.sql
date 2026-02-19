-- Create storage bucket for venue photos with public access
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'venue-photos',
  'venue-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access
CREATE POLICY "Public read access for venue photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'venue-photos');

-- Create policy for authenticated users to upload
CREATE POLICY "Authenticated users can upload venue photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'venue-photos');;
