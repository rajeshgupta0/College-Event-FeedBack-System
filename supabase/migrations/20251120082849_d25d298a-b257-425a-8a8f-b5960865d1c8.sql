-- Add archived column to events table
ALTER TABLE public.events 
ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;

-- Create index for better performance when filtering archived events
CREATE INDEX idx_events_archived ON public.events(archived);