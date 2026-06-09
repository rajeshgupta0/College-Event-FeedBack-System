-- Create resources table for equipment and logistics
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- projector, sound_system, stage, chairs, refreshments
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'available', -- available, in_use, maintenance
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create event_resources junction table
CREATE TABLE IF NOT EXISTS public.event_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  quantity_needed INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'requested', -- requested, confirmed, allocated
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, resource_id)
);

-- Create volunteers table
CREATE TABLE IF NOT EXISTS public.volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT,
  skills TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create volunteer_assignments table
CREATE TABLE IF NOT EXISTS public.volunteer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES public.volunteers(id) ON DELETE CASCADE,
  task TEXT NOT NULL, -- registration_desk, stage, audio, crowd_control
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, completed
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- event_reminder, feedback_reminder, alert
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resources
CREATE POLICY "Admins can manage resources"
ON public.resources FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view resources"
ON public.resources FOR SELECT
USING (true);

-- RLS Policies for event_resources
CREATE POLICY "Admins can manage event resources"
ON public.event_resources FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view event resources"
ON public.event_resources FOR SELECT
USING (true);

-- RLS Policies for volunteers
CREATE POLICY "Admins can manage volunteers"
ON public.volunteers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Volunteers can view their profile"
ON public.volunteers FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policies for volunteer_assignments
CREATE POLICY "Admins can manage assignments"
ON public.volunteer_assignments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Volunteers can view their assignments"
ON public.volunteer_assignments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.volunteers
  WHERE volunteers.id = volunteer_assignments.volunteer_id
  AND volunteers.user_id = auth.uid()
));

-- RLS Policies for notifications
CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on resources
CREATE OR REPLACE FUNCTION update_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_resources_updated_at_trigger
BEFORE UPDATE ON public.resources
FOR EACH ROW
EXECUTE FUNCTION update_resources_updated_at();

-- Add indexes for better performance
CREATE INDEX idx_event_resources_event_id ON public.event_resources(event_id);
CREATE INDEX idx_event_resources_resource_id ON public.event_resources(resource_id);
CREATE INDEX idx_volunteer_assignments_event_id ON public.volunteer_assignments(event_id);
CREATE INDEX idx_volunteer_assignments_volunteer_id ON public.volunteer_assignments(volunteer_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- Insert some sample resources
INSERT INTO public.resources (name, type, quantity, status) VALUES
  ('Projector', 'projector', 5, 'available'),
  ('Sound System', 'sound_system', 3, 'available'),
  ('Main Stage', 'stage', 1, 'available'),
  ('Auditorium Chairs', 'chairs', 500, 'available'),
  ('Seminar Hall Chairs', 'chairs', 200, 'available'),
  ('Refreshments Package', 'refreshments', 10, 'available'),
  ('Wireless Microphone', 'sound_system', 10, 'available'),
  ('Podium', 'stage', 3, 'available');