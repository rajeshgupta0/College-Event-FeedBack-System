-- Add missing foreign key constraint for feedback table
-- Check if constraint already exists before adding

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'feedback_user_id_fkey'
  ) THEN
    ALTER TABLE public.feedback
      ADD CONSTRAINT feedback_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better query performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_event_id ON public.feedback(event_id);