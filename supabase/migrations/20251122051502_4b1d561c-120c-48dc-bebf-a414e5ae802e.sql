-- Create event_registrations table for QR attendance tracking
CREATE TABLE public.event_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  qr_code TEXT NOT NULL UNIQUE,
  attended BOOLEAN DEFAULT false,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  attended_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(student_id, event_id)
);

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own registrations"
  ON public.event_registrations FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can register for events"
  ON public.event_registrations FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins can view all registrations"
  ON public.event_registrations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update attendance"
  ON public.event_registrations FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create event_interests table for "I'm Interested" feature
CREATE TABLE public.event_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, event_id)
);

ALTER TABLE public.event_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage their interests"
  ON public.event_interests FOR ALL
  USING (auth.uid() = student_id);

CREATE POLICY "Everyone can view interest counts"
  ON public.event_interests FOR SELECT
  USING (true);

-- Create event_bookmarks table
CREATE TABLE public.event_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, event_id)
);

ALTER TABLE public.event_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage their bookmarks"
  ON public.event_bookmarks FOR ALL
  USING (auth.uid() = student_id);

-- Create student_points table for gamification
CREATE TABLE public.student_points (
  student_id UUID NOT NULL PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'Beginner',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own points"
  ON public.student_points FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "System can manage points"
  ON public.student_points FOR ALL
  USING (true);

-- Create student_badges table
CREATE TABLE public.student_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  points_required INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view badges"
  ON public.student_badges FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage badges"
  ON public.student_badges FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create student_earned_badges junction table
CREATE TABLE public.student_earned_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.student_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, badge_id)
);

ALTER TABLE public.student_earned_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their earned badges"
  ON public.student_earned_badges FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "System can award badges"
  ON public.student_earned_badges FOR INSERT
  WITH CHECK (true);

-- Create feedback_ratings table for multi-criteria ratings
CREATE TABLE public.feedback_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE UNIQUE,
  content_rating INTEGER CHECK (content_rating >= 1 AND content_rating <= 5),
  speaker_rating INTEGER CHECK (speaker_rating >= 1 AND speaker_rating <= 5),
  management_rating INTEGER CHECK (management_rating >= 1 AND management_rating <= 5),
  venue_rating INTEGER CHECK (venue_rating >= 1 AND venue_rating <= 5),
  timing_rating INTEGER CHECK (timing_rating >= 1 AND timing_rating <= 5),
  audiovisual_rating INTEGER CHECK (audiovisual_rating >= 1 AND audiovisual_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view ratings for their feedback"
  ON public.feedback_ratings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.feedback
    WHERE feedback.id = feedback_ratings.feedback_id
    AND feedback.user_id = auth.uid()
  ));

CREATE POLICY "Students can create ratings"
  ON public.feedback_ratings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.feedback
    WHERE feedback.id = feedback_ratings.feedback_id
    AND feedback.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all ratings"
  ON public.feedback_ratings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add new columns to events table for enhanced event details
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS venue TEXT,
  ADD COLUMN IF NOT EXISTS speakers TEXT[],
  ADD COLUMN IF NOT EXISTS poster_url TEXT,
  ADD COLUMN IF NOT EXISTS benefits TEXT[],
  ADD COLUMN IF NOT EXISTS rewards TEXT[],
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS max_participants INTEGER;

-- Add anonymous field to feedback table
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS mood_rating TEXT;

-- Insert default badges
INSERT INTO public.student_badges (name, description, icon, points_required) VALUES
  ('Event Explorer', 'Register for your first event', '🎯', 10),
  ('Top Reviewer', 'Submit 10 feedback responses', '⭐', 50),
  ('Active Participant', 'Attend 5 events', '🏆', 100),
  ('Feedback Champion', 'Submit 25 feedback responses', '🌟', 150),
  ('Event Enthusiast', 'Attend 10 events', '🎉', 200),
  ('Master Contributor', 'Reach 500 points', '👑', 500)
ON CONFLICT (name) DO NOTHING;

-- Create trigger for updating student points updated_at
CREATE TRIGGER update_student_points_updated_at
  BEFORE UPDATE ON public.student_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_registrations_student ON public.event_registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_interests_event ON public.event_interests(event_id);
CREATE INDEX IF NOT EXISTS idx_event_bookmarks_student ON public.event_bookmarks(student_id);
CREATE INDEX IF NOT EXISTS idx_feedback_ratings_feedback ON public.feedback_ratings(feedback_id);