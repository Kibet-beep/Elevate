-- Ensure user_branch_assignments has an updated_at timestamptz column
-- and a trigger that updates it on insert/update.

ALTER TABLE public.user_branch_assignments
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Create or replace helper trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Drop existing trigger if present, then create it
DROP TRIGGER IF EXISTS set_updated_at_user_branch_assignments ON public.user_branch_assignments;
CREATE TRIGGER set_updated_at_user_branch_assignments
BEFORE INSERT OR UPDATE ON public.user_branch_assignments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_column();
