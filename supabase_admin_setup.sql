-- ==============================================================================
-- FARMER ID CARD: SUPABASE RLS POLICIES & SUPER ADMIN FUNCTIONS
-- Run this script in your Supabase Project Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Ensure 'approved' column exists on the profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;

-- 2. Mark existing users as approved so current users are not disrupted
UPDATE public.profiles 
SET approved = true 
WHERE (approved IS NULL OR approved = false) 
  AND role != 'pending_approval' 
  AND email != 'sukaleshashikant@gmail.com';

-- Always ensure primary Super Admin is approved and admin
UPDATE public.profiles
SET role = 'admin', approved = true, confirmed = true
WHERE email = 'sukaleshashikant@gmail.com';

-- 3. Configure Row Level Security (RLS) on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clean up any conflicting old policies
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin and self update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;

-- SELECT policy: Authenticated users can view profiles
CREATE POLICY "Allow authenticated read profiles" ON public.profiles
FOR SELECT TO authenticated
USING (true);

-- INSERT policy: Authenticated users can register their profile
CREATE POLICY "Allow insert profiles" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (true);

-- UPDATE policy: Super Admin and Admins can update roles & approval
CREATE POLICY "Allow admin and self update profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (
  (auth.jwt() ->> 'email') = 'sukaleshashikant@gmail.com'
  OR auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (true);

-- DELETE policy: Super Admin and Admins can delete profiles
CREATE POLICY "Allow admin delete profiles" ON public.profiles
FOR DELETE TO authenticated
USING (
  (auth.jwt() ->> 'email') = 'sukaleshashikant@gmail.com'
  OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 4. Configure RLS on public.farmer_cards so admins can delete cards when deleting users
ALTER TABLE public.farmer_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admin delete farmer_cards" ON public.farmer_cards;
CREATE POLICY "Allow admin delete farmer_cards" ON public.farmer_cards
FOR DELETE TO authenticated
USING (
  (auth.jwt() ->> 'email') = 'sukaleshashikant@gmail.com'
  OR auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 5. RPC FUNCTION: delete_user_by_admin (Deletes from farmer_cards, profiles, AND auth.users)
-- This function runs with SECURITY DEFINER to bypass client RLS restrictions and delete from auth.users
CREATE OR REPLACE FUNCTION delete_user_by_admin(
  target_user_id UUID DEFAULT NULL, 
  target_user_email TEXT DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_email TEXT;
  caller_role TEXT;
BEGIN
  -- Extract email of the caller from JWT token
  caller_email := auth.jwt() ->> 'email';

  -- Prevent deletion of Primary Super Admin account
  IF LOWER(COALESCE(target_user_email, '')) = 'sukaleshashikant@gmail.com' THEN
    RAISE EXCEPTION 'Action Denied: Primary Super Admin account cannot be deleted!';
  END IF;

  -- Check if caller is Super Admin or Admin in profiles
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

  IF LOWER(COALESCE(caller_email, '')) != 'sukaleshashikant@gmail.com' AND COALESCE(caller_role, '') != 'admin' THEN
    RAISE EXCEPTION 'Action Denied: Only Super Admin and Admins are permitted to delete users.';
  END IF;

  -- Step A: Delete associated farmer cards
  DELETE FROM public.farmer_cards
  WHERE (target_user_id IS NOT NULL AND user_id = target_user_id)
     OR (target_user_email IS NOT NULL AND user_email = target_user_email);

  -- Step B: Delete from public.profiles table
  DELETE FROM public.profiles
  WHERE (target_user_id IS NOT NULL AND id = target_user_id)
     OR (target_user_email IS NOT NULL AND email = target_user_email);

  -- Step C: Delete from auth.users (Permanently deletes the Supabase authentication account)
  DELETE FROM auth.users
  WHERE (target_user_id IS NOT NULL AND id = target_user_id)
     OR (target_user_email IS NOT NULL AND email = target_user_email);

  RETURN true;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_by_admin(UUID, TEXT) TO authenticated;

-- 6. RPC FUNCTION: approve_user_by_admin (Sets role = 'user', approved = true, confirmed = true)
CREATE OR REPLACE FUNCTION approve_user_by_admin(
  target_user_id UUID DEFAULT NULL, 
  target_user_email TEXT DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_email TEXT;
  caller_role TEXT;
BEGIN
  caller_email := auth.jwt() ->> 'email';
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

  IF LOWER(COALESCE(caller_email, '')) != 'sukaleshashikant@gmail.com' AND COALESCE(caller_role, '') != 'admin' THEN
    RAISE EXCEPTION 'Action Denied: Only Super Admin and Admins are permitted to approve users.';
  END IF;

  UPDATE public.profiles
  SET role = 'user', approved = true, confirmed = true
  WHERE (target_user_id IS NOT NULL AND id = target_user_id)
     OR (target_user_email IS NOT NULL AND email = target_user_email);

  RETURN true;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION approve_user_by_admin(UUID, TEXT) TO authenticated;
