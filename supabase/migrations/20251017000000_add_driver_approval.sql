-- Add approved column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT true;

-- Update existing drivers to be approved (for backward compatibility)
UPDATE public.profiles 
SET approved = true 
WHERE role = 'DRIVER';

-- Drop the old trigger function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create updated function to handle new user registration with approval logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role public.user_role;
  is_approved BOOLEAN;
BEGIN
  -- Get the role from metadata
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'CUSTOMER');
  
  -- Set approved based on role
  -- DRIVER role requires admin approval, so set to false
  -- ADMIN and CUSTOMER are auto-approved
  IF user_role = 'DRIVER' THEN
    is_approved := false;
  ELSE
    is_approved := true;
  END IF;

  INSERT INTO public.profiles (id, email, name, role, approved, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    user_role,
    is_approved,
    false  -- All users start as inactive
  );
  RETURN NEW;
END;
$$;

-- Recreate trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.approved IS 'Indicates if driver has been approved by admin. Auto-true for ADMIN and CUSTOMER roles.';
