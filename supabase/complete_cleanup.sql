-- ========================================
-- COMPLETE DATABASE CLEANUP (INCLUDING AUTH)
-- ========================================
-- Run this in Supabase Dashboard → SQL Editor
-- This will delete ALL data including auth accounts

-- WARNING: This will delete EVERYTHING! Fresh start!

-- 1. Delete all application data first
DELETE FROM users;
DELETE FROM businesses;

-- 2. Delete all auth accounts
-- This requires admin privileges and might need to be done via dashboard
DELETE FROM auth.users WHERE email NOT IN ('your-admin-email@domain.com'); -- Keep your admin account
-- OR delete all auth accounts:
-- DELETE FROM auth.users;

-- 3. Alternative: Use specific email patterns if you know them
-- DELETE FROM auth.users WHERE email LIKE '%@gmail.com';
-- DELETE FROM auth.users WHERE email LIKE '%@yahoo.com';

-- 4. Verify cleanup
SELECT 'App users deleted' as status, COUNT(*) as count FROM users
UNION ALL
SELECT 'Businesses deleted' as status, COUNT(*) as count FROM businesses
UNION ALL  
SELECT 'Auth users remaining' as status, COUNT(*) as count FROM auth.users;

-- ========================================
-- NOTE: If the DELETE FROM auth.users doesn't work,
-- you'll need to delete auth accounts manually:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Select all users and delete them
-- 3. Keep at least one admin account for yourself
-- ========================================
