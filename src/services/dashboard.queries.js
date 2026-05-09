// src/services/dashboard.queries.js
import { supabase } from '../lib/supabase'

export function buildTransactionsQuery({ businessId, branchId }) {
  const query = supabase
    .from('transactions')
    .select('*')
    .eq('business_id', businessId)

  if (branchId) {
    query.eq('branch_id', branchId)
  }

  return query
}

export function buildExpensesQuery({ businessId, branchId }) {
  const query = supabase
    .from('transactions')
    .select('*')
    .eq('business_id', businessId)

  if (branchId) {
    query.eq('branch_id', branchId)
  }

  return query
}

export function buildFloatBaselineQuery({ businessId, branchId }) {
  const query = supabase
    .from('float_baseline')
    .select('*')
    .eq('business_id', businessId)

  if (branchId) {
    query.eq('branch_id', branchId)
  }

  return query
}

export function buildTransfersQuery({ businessId, branchId }) {
  const query = supabase
    .from('transfers')
    .select('*')
    .eq('business_id', businessId)

  if (branchId) {
    query.eq('branch_id', branchId)
  }

  return query
}
