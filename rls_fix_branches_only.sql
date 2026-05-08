-- ========================================
-- CRITICAL FIX: RLS POLICIES FOR BRANCHES & USER_BRANCH_ASSIGNMENTS
-- ========================================
-- This SQL file fixes the missing RLS policies that are causing 400 errors.
-- Run in Supabase SQL editor.

-- ========================================
-- BRANCHES TABLE RLS POLICIES
-- ========================================
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branches_user_select" ON branches;
DROP POLICY IF EXISTS "branches_user_insert" ON branches;
DROP POLICY IF EXISTS "branches_user_update" ON branches;

CREATE POLICY "branches_user_select" ON branches
FOR SELECT USING (
  business_id IN (
    SELECT u.business_id FROM users u
    WHERE u.id = auth.uid() AND u.is_active = true
  )
);

CREATE POLICY "branches_user_insert" ON branches
FOR INSERT WITH CHECK (
  business_id IN (
    SELECT u.business_id FROM users u
    WHERE u.id = auth.uid() AND u.is_active = true AND u.role = 'owner'
  )
);

CREATE POLICY "branches_user_update" ON branches
FOR UPDATE USING (
  business_id IN (
    SELECT u.business_id FROM users u
    WHERE u.id = auth.uid() AND u.is_active = true AND u.role = 'owner'
  )
) WITH CHECK (
  business_id IN (
    SELECT u.business_id FROM users u
    WHERE u.id = auth.uid() AND u.is_active = true AND u.role = 'owner'
  )
);

-- ========================================
-- USER_BRANCH_ASSIGNMENTS TABLE RLS POLICIES
-- ========================================
ALTER TABLE user_branch_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_branch_assignments_user_select" ON user_branch_assignments;
DROP POLICY IF EXISTS "user_branch_assignments_user_insert" ON user_branch_assignments;
DROP POLICY IF EXISTS "user_branch_assignments_user_update" ON user_branch_assignments;

CREATE POLICY "user_branch_assignments_user_select" ON user_branch_assignments
FOR SELECT USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.is_active = true
      AND u.role IN ('owner', 'manager')
      AND u.business_id IN (
        SELECT business_id FROM users WHERE id = user_branch_assignments.user_id
      )
  )
);

CREATE POLICY "user_branch_assignments_user_insert" ON user_branch_assignments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.is_active = true
      AND u.role = 'owner'
      AND u.business_id IN (
        SELECT business_id FROM users WHERE id = user_branch_assignments.user_id
      )
  )
);

CREATE POLICY "user_branch_assignments_user_update" ON user_branch_assignments
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.is_active = true
      AND u.role = 'owner'
      AND u.business_id IN (
        SELECT business_id FROM users WHERE id = user_branch_assignments.user_id
      )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.is_active = true
      AND u.role = 'owner'
      AND u.business_id IN (
        SELECT business_id FROM users WHERE id = user_branch_assignments.user_id
      )
  )
);
