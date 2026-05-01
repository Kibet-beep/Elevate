-- ========================================
-- CLEAN DATABASE FOR FRESH TESTING
-- ========================================
-- Run this in Supabase Dashboard → SQL Editor
-- This will remove all business data while keeping the database structure

-- WARNING: This will permanently delete all your business data!
-- Make sure you want to do this before running!

-- 1. Delete all users (this will cascade to delete related data)
DELETE FROM users;

-- 2. Delete all businesses
DELETE FROM businesses;

-- 3. Reset sequences (if they exist)
-- This ensures new records start from ID 1 again
-- Note: Many tables don't have sequences or use different naming
-- You can check what sequences exist with: \ds in PostgreSQL

-- Try to reset business sequence (may not exist, that's OK)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'businesses_id_seq') THEN
        ALTER SEQUENCE businesses_id_seq RESTART WITH 1;
    END IF;
END $$;

-- Note: users table uses auth.user.id, so no sequence to reset

-- 4. Optional: Delete any other business-related tables
-- Uncomment these if you have these tables:
-- DELETE FROM inventory;
-- DELETE FROM transactions;
-- DELETE FROM sales;
-- ALTER SEQUENCE inventory_id_seq RESTART WITH 1;
-- ALTER SEQUENCE transactions_id_seq RESTART WITH 1;
-- ALTER SEQUENCE sales_id_seq RESTART WITH 1;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
-- Run these after cleanup to verify everything is deleted

-- Check if users table is empty
SELECT COUNT(*) as users_count FROM users;

-- Check if businesses table is empty  
SELECT COUNT(*) as businesses_count FROM businesses;

-- Show remaining auth users (these are Supabase auth accounts)
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- ========================================
-- NOTES:
-- ========================================
-- 1. This deletes business data but keeps Supabase auth accounts
-- 2. Users can still login with existing credentials
-- 3. They'll go through onboarding again since no business/user records exist
-- 4. If you want to delete auth accounts too, use the Supabase Dashboard UI
