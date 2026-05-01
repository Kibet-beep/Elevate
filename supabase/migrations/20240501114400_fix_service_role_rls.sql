-- Fix RLS policies for service role access to users table
-- This migration allows the service role to bypass RLS restrictions

-- Create service role bypass policy
CREATE POLICY IF NOT EXISTS "Service role bypass RLS" ON users
  USING (auth.role() = 'service_role');

-- Create comprehensive service role access policy
CREATE POLICY IF NOT EXISTS "Service role full access" ON users
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
