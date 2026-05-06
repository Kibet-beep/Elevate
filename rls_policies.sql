-- ========================================
-- BRANCH RLS POLICIES (READ + WRITE)
-- ========================================
-- Apply in Supabase SQL editor in order.

-- 1) Enable RLS on branch-bound tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_takes ENABLE ROW LEVEL SECURITY;

-- 2) Remove previous policies
DROP POLICY IF EXISTS "products_branch_select" ON products;
DROP POLICY IF EXISTS "products_branch_insert" ON products;
DROP POLICY IF EXISTS "products_branch_update" ON products;
DROP POLICY IF EXISTS "transactions_branch_select" ON transactions;
DROP POLICY IF EXISTS "transactions_branch_insert" ON transactions;
DROP POLICY IF EXISTS "transactions_branch_update" ON transactions;
DROP POLICY IF EXISTS "transfers_branch_select" ON transfers;
DROP POLICY IF EXISTS "transfers_branch_insert" ON transfers;
DROP POLICY IF EXISTS "transfers_branch_update" ON transfers;
DROP POLICY IF EXISTS "stock_takes_branch_select" ON stock_takes;
DROP POLICY IF EXISTS "stock_takes_branch_insert" ON stock_takes;
DROP POLICY IF EXISTS "stock_takes_branch_update" ON stock_takes;

-- 3) Shared branch-access predicate per table
-- Owner: any row in own business
-- Manager/Cashier: only assigned branch rows in own business

CREATE POLICY "products_branch_select" ON products
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.business_id = products.business_id
      AND (u.role = 'owner' OR products.branch_id IN (
        SELECT uba.branch_id FROM user_branch_assignments uba
        WHERE uba.user_id = auth.uid() AND uba.is_active = true
      ))
  )
);

CREATE POLICY "products_branch_insert" ON products
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.business_id = products.business_id
      AND (u.role = 'owner' OR products.branch_id IN (
        SELECT uba.branch_id FROM user_branch_assignments uba
        WHERE uba.user_id = auth.uid() AND uba.is_active = true
      ))
  )
);

CREATE POLICY "products_branch_update" ON products
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.business_id = products.business_id
      AND (u.role = 'owner' OR products.branch_id IN (
        SELECT uba.branch_id FROM user_branch_assignments uba
        WHERE uba.user_id = auth.uid() AND uba.is_active = true
      ))
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.business_id = products.business_id
      AND (u.role = 'owner' OR products.branch_id IN (
        SELECT uba.branch_id FROM user_branch_assignments uba
        WHERE uba.user_id = auth.uid() AND uba.is_active = true
      ))
  )
);

CREATE POLICY "transactions_branch_select" ON transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.business_id = transactions.business_id
      AND (u.role = 'owner' OR transactions.branch_id IN (
        SELECT uba.branch_id FROM user_branch_assignments uba
        WHERE uba.user_id = auth.uid() AND uba.is_active = true
      ))
  )
);

CREATE POLICY "transactions_branch_insert" ON transactions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.business_id = transactions.business_id
      AND (u.role = 'owner' OR transactions.branch_id IN (
        SELECT uba.branch_id FROM user_branch_assignments uba
        WHERE uba.user_id = auth.uid() AND uba.is_active = true
      ))
  )
);

CREATE POLICY "transactions_branch_update" ON transactions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.business_id = transactions.business_id
      AND (u.role = 'owner' OR transactions.branch_id IN (
        SELECT uba.branch_id FROM user_branch_assignments uba
        WHERE uba.user_id = auth.uid() AND uba.is_active = true
      ))
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.business_id = transactions.business_id
      AND (u.role = 'owner' OR transactions.branch_id IN (
        SELECT uba.branch_id FROM user_branch_assignments uba
        WHERE uba.user_id = auth.uid() AND uba.is_active = true
      ))
  )
);

CREATE POLICY "transfers_branch_select" ON transfers
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.business_id = transfers.business_id
      AND (u.role = 'owner' OR transfers.branch_id IN (
        SELECT uba.branch_id FROM user_branch_assignments uba
        WHERE uba.user_id = auth.uid() AND uba.is_active = true
      ))
  )
);

CREATE POLICY "transfers_branch_insert" ON transfers
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.business_id = transfers.business_id
      AND (u.role = 'owner' OR transfers.branch_id IN (
        SELECT uba.branch_id FROM user_branch_assignments uba
        WHERE uba.user_id = auth.uid() AND uba.is_active = true
      ))
  )
);

CREATE POLICY "transfers_branch_update" ON transfers
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.business_id = transfers.business_id
      AND (u.role = 'owner' OR transfers.branch_id IN (
        SELECT uba.branch_id FROM user_branch_assignments uba
        WHERE uba.user_id = auth.uid() AND uba.is_active = true
      ))
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.business_id = transfers.business_id
      AND (u.role = 'owner' OR transfers.branch_id IN (
        SELECT uba.branch_id FROM user_branch_assignments uba
        WHERE uba.user_id = auth.uid() AND uba.is_active = true
      ))
  )
);

CREATE POLICY "stock_takes_branch_select" ON stock_takes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.business_id = stock_takes.business_id
      AND (u.role = 'owner' OR stock_takes.branch_id IN (
        SELECT uba.branch_id FROM user_branch_assignments uba
        WHERE uba.user_id = auth.uid() AND uba.is_active = true
      ))
  )
);

CREATE POLICY "stock_takes_branch_insert" ON stock_takes
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.business_id = stock_takes.business_id
      AND (u.role = 'owner' OR stock_takes.branch_id IN (
        SELECT uba.branch_id FROM user_branch_assignments uba
        WHERE uba.user_id = auth.uid() AND uba.is_active = true
      ))
  )
);

CREATE POLICY "stock_takes_branch_update" ON stock_takes
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.business_id = stock_takes.business_id
      AND (u.role = 'owner' OR stock_takes.branch_id IN (
        SELECT uba.branch_id FROM user_branch_assignments uba
        WHERE uba.user_id = auth.uid() AND uba.is_active = true
      ))
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.business_id = stock_takes.business_id
      AND (u.role = 'owner' OR stock_takes.branch_id IN (
        SELECT uba.branch_id FROM user_branch_assignments uba
        WHERE uba.user_id = auth.uid() AND uba.is_active = true
      ))
  )
);
