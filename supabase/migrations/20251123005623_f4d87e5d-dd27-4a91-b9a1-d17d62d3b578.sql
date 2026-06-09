-- Fix function search path security issue
DROP TRIGGER IF EXISTS update_resources_updated_at_trigger ON public.resources;
DROP FUNCTION IF EXISTS update_resources_updated_at();

CREATE OR REPLACE FUNCTION update_resources_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_resources_updated_at_trigger
BEFORE UPDATE ON public.resources
FOR EACH ROW
EXECUTE FUNCTION update_resources_updated_at();