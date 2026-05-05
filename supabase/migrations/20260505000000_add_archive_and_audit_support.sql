-- Phase 2: Add archive support and audit trail

-- ── ARCHIVE STATUS COLUMNS ──

-- Add status column to products (archive support)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived'));

-- Add status column to branches (already exists in some cases, but ensure it exists)
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived'));

-- Add lifecycle_state to transactions for draft/staged/finalized tracking
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS lifecycle_state TEXT DEFAULT 'finalized' CHECK (lifecycle_state IN ('draft', 'staged', 'finalized', 'archived'));

-- ── AUDIT LOG TABLE ──

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,  -- 'product', 'branch', 'employee', 'transaction', 'stock'
  record_id UUID NOT NULL,
  action TEXT NOT NULL,  -- 'create', 'update', 'delete', 'archive', 'restore'
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  notes TEXT
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_business_id ON audit_log(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_type ON audit_log(record_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_business_record ON audit_log(business_id, record_type, record_id);

-- Enable RLS on audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view audit logs for their business
CREATE POLICY "Users can view audit logs for their business"
  ON audit_log FOR SELECT
  USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
    UNION
    SELECT business_id FROM users WHERE id = auth.uid() AND is_active = true
  ));

-- RLS: Audit logs can be inserted by system (via triggers or functions)
CREATE POLICY "System can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
    UNION
    SELECT business_id FROM users WHERE id = auth.uid() AND is_active = true
  ));

-- ── CREATE AUDIT TRIGGER FUNCTIONS ──

CREATE OR REPLACE FUNCTION log_product_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (business_id, record_type, record_id, action, old_values, changed_by, notes)
    VALUES (OLD.business_id, 'product', OLD.id, 'archive', row_to_json(OLD), auth.uid(), 'Product archived');
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'archived' THEN
      INSERT INTO audit_log (business_id, record_type, record_id, action, old_values, new_values, changed_by, notes)
      VALUES (NEW.business_id, 'product', NEW.id, 'archive', row_to_json(OLD), row_to_json(NEW), auth.uid(), 'Product archived');
    ELSE
      INSERT INTO audit_log (business_id, record_type, record_id, action, old_values, new_values, changed_by)
      VALUES (NEW.business_id, 'product', NEW.id, 'update', row_to_json(OLD), row_to_json(NEW), auth.uid());
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (business_id, record_type, record_id, action, new_values, changed_by)
    VALUES (NEW.business_id, 'product', NEW.id, 'create', row_to_json(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_branch_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (business_id, record_type, record_id, action, old_values, changed_by, notes)
    VALUES (OLD.business_id, 'branch', OLD.id, 'archive', row_to_json(OLD), auth.uid(), 'Branch archived');
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'archived' THEN
      INSERT INTO audit_log (business_id, record_type, record_id, action, old_values, new_values, changed_by, notes)
      VALUES (NEW.business_id, 'branch', NEW.id, 'archive', row_to_json(OLD), row_to_json(NEW), auth.uid(), 'Branch archived');
    ELSE
      INSERT INTO audit_log (business_id, record_type, record_id, action, old_values, new_values, changed_by)
      VALUES (NEW.business_id, 'branch', NEW.id, 'update', row_to_json(OLD), row_to_json(NEW), auth.uid());
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (business_id, record_type, record_id, action, new_values, changed_by)
    VALUES (NEW.business_id, 'branch', NEW.id, 'create', row_to_json(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_transaction_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.lifecycle_state IS DISTINCT FROM NEW.lifecycle_state THEN
      INSERT INTO audit_log (business_id, record_type, record_id, action, old_values, new_values, changed_by, notes)
      VALUES (NEW.business_id, 'transaction', NEW.id, 'update', row_to_json(OLD), row_to_json(NEW), auth.uid(), 'Transaction state: ' || OLD.lifecycle_state || ' → ' || NEW.lifecycle_state);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (business_id, record_type, record_id, action, new_values, changed_by)
    VALUES (NEW.business_id, 'transaction', NEW.id, 'create', row_to_json(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── CREATE TRIGGERS ──

DROP TRIGGER IF EXISTS trigger_log_product_changes ON products;
CREATE TRIGGER trigger_log_product_changes
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION log_product_changes();

DROP TRIGGER IF EXISTS trigger_log_branch_changes ON branches;
CREATE TRIGGER trigger_log_branch_changes
AFTER INSERT OR UPDATE OR DELETE ON branches
FOR EACH ROW EXECUTE FUNCTION log_branch_changes();

DROP TRIGGER IF EXISTS trigger_log_transaction_changes ON transactions;
CREATE TRIGGER trigger_log_transaction_changes
AFTER INSERT OR UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION log_transaction_changes();
