// src/features/dashboard/utils/dashboard.queries.js
import { supabase } from '../../../lib/supabase'

export function applyBranchScope(query, branchId) {
  if (!branchId) return query
  return query.eq('branch_id', branchId)
}

export function buildTransactionsQuery({ businessId, branchId }) {
  return applyBranchScope(
    supabase
      .from('transactions')
      .select('*')
      .eq('business_id', businessId),
    branchId
  )
}

export function buildExpensesQuery({ businessId, branchId }) {
  return applyBranchScope(
    supabase
      .from('transactions')
      .select('*')
      .eq('business_id', businessId),
    branchId
  )
}

export function buildFloatBaselineQuery({ businessId, branchId }) {
  return applyBranchScope(
    supabase
      .from('float_baseline')
      .select('*')
      .eq('business_id', businessId),
    branchId
  )
}

export function buildTransfersQuery({ businessId, branchId }) {
  return applyBranchScope(
    supabase
      .from('transfers')
      .select('*')
      .eq('business_id', businessId),
    branchId
  )
}
