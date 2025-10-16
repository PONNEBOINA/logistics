-- Fix critical security issue: Move roles to separate table
CREATE TYPE public.app_role AS ENUM ('ADMIN', 'DRIVER', 'CUSTOMER');

-- Create user_roles table with proper security
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::text::app_role 
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Update bookings table to include addresses and proper status flow
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS pickup_address TEXT,
  ADD COLUMN IF NOT EXISTS drop_address TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- Add index for active vehicles lookup
CREATE INDEX IF NOT EXISTS idx_vehicles_active ON public.vehicles(assigned_driver) WHERE assigned_driver IS NOT NULL;

-- Add index for pending bookings
CREATE INDEX IF NOT EXISTS idx_bookings_pending ON public.bookings(driver_id, status) WHERE status = 'PENDING';

-- RLS policy for user_roles (users can view their own roles)
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admin can manage all roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));