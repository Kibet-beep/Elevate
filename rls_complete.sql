-- ========================================
-- COMPLETE BRANCH RLS CHECKLIST
-- ========================================

-- Verify row security is enabled on branch-bound tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('products', 'transactions', 'transfers', 'stock_takes');

-- Verify policies were created
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('products', 'transactions', 'transfers', 'stock_takes')
ORDER BY tablename, policyname;

-- Smoke tests (run as each role user session):
-- 1) Should return only allowed branch rows
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM transactions;
SELECT COUNT(*) FROM transfers;
SELECT COUNT(*) FROM stock_takes;

-- 2) Should fail for forbidden insert/update to unassigned branch
-- INSERT INTO transactions (...) VALUES (...branch_id='unassigned-branch'...);
-- UPDATE products SET branch_id = 'unassigned-branch' WHERE id = '...';
