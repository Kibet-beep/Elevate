-- ========================================
-- SIMPLE DATABASE CLEANUP
-- ========================================
-- Run this in Supabase Dashboard → SQL Editor
-- This version removes all data without sequence resets

-- WARNING: This will permanently delete all your business data!

-- 1. Delete all users (this will cascade to delete related data)
DELETE FROM users;

-- 2. Delete all businesses
DELETE FROM businesses;

-- 3. Verify cleanup worked
SELECT 'Users deleted' as status, COUNT(*) as remaining_count FROM users
UNION ALL
SELECT 'Businesses deleted' as status, COUNT(*) as remaining_count FROM businesses;

-- 4. Show remaining auth users (these stay intact)
SELECT 'Remaining auth users' as info, COUNT(*) as count FROM auth.users;
