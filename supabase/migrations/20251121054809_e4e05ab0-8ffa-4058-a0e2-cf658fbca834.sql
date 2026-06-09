-- Create storage buckets for feedback files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('feedback-images', 'feedback-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('feedback-audio', 'feedback-audio', true, 10485760, ARRAY['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4']::text[])
ON CONFLICT (id) DO NOTHING;

-- Add columns to feedback table for multi-modal content
ALTER TABLE public.feedback
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS image_analysis JSONB,
ADD COLUMN IF NOT EXISTS audio_analysis JSONB;

-- RLS policies for feedback-images bucket
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feedback-images');

CREATE POLICY "Images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'feedback-images');

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'feedback-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policies for feedback-audio bucket
CREATE POLICY "Authenticated users can upload audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feedback-audio');

CREATE POLICY "Audio is publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'feedback-audio');

CREATE POLICY "Users can delete their own audio"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'feedback-audio' AND auth.uid()::text = (storage.foldername(name))[1]);