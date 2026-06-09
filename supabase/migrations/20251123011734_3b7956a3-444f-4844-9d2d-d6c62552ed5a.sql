-- Create media_from_feedback table for event highlight photos/videos
CREATE TABLE public.media_from_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  feedback_id UUID NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('photo', 'video')),
  consent_given BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  caption TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID
);

-- Create media_likes table
CREATE TABLE public.media_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES public.media_from_feedback(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(media_id, user_id)
);

-- Create media_comments table
CREATE TABLE public.media_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES public.media_from_feedback(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_from_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for media_from_feedback
CREATE POLICY "Everyone can view approved media"
ON public.media_from_feedback FOR SELECT
USING (status = 'approved');

CREATE POLICY "Students can create media with their feedback"
ON public.media_from_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all media"
ON public.media_from_feedback FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for media_likes
CREATE POLICY "Everyone can view likes"
ON public.media_likes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can like media"
ON public.media_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
ON public.media_likes FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for media_comments
CREATE POLICY "Everyone can view comments"
ON public.media_comments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can comment"
ON public.media_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.media_comments FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any comment"
ON public.media_comments FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_media_from_feedback_event_id ON public.media_from_feedback(event_id);
CREATE INDEX idx_media_from_feedback_status ON public.media_from_feedback(status);
CREATE INDEX idx_media_from_feedback_feedback_id ON public.media_from_feedback(feedback_id);
CREATE INDEX idx_media_likes_media_id ON public.media_likes(media_id);
CREATE INDEX idx_media_comments_media_id ON public.media_comments(media_id);

-- Enable realtime for live monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE public.media_from_feedback;