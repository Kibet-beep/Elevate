-- Fix RLS policies for service role access to users table
-- Run this in Supabase dashboard → SQL Editor

-- 1. Ensure service role can bypass RLS on users table
ALTER POLICY "Service role can bypass RLS" ON users USING (auth.role() = 'service_role');

-- 2. Or create a specific policy for service role
CREATE POLICY IF NOT EXISTS "Service role full access" ON users
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3. Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. Drop any conflicting policies that might block service role
-- (Run this only if you have issues)
-- DROP POLICY IF EXISTS "Users can view own profile" ON users;
-- DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- 5. Create comprehensive service role policy
CREATE POLICY IF NOT EXISTS "Service role full management" ON users
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 6. Test the service role access
-- This query should work after running the policies above
SELECT 
  auth.role(),
  current_user,
  session_user;
