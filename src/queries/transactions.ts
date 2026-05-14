// src/queries/transactions.ts
import { supabase } from '../lib/supabase'

export interface TransactionQuery {
  businessId: string
  branchId?: string
  type?: 'sale' | 'expense' | 'transfer'
  startDate?: string
  endDate?: string
  limit?: number
}

export async function fetchTransactions(query: TransactionQuery) {
  const { businessId, branchId, type, startDate, endDate, limit } = query

  let supabaseQuery = supabase
    .from('transactions')
    .select(`
      id,
      type,
      payment_account,
      date,
      amount,
      display_name,
      lifecycle_state,
      created_at,
      sale_items (
        product_id,
        product_name,
        quantity,
        unit_price,
        total_amount
      ),
      expense (
        category,
        amount,
        description
      ),
      transfer (
        from_account,
        to_account,
        amount,
        transaction_cost
      )
    `)
    .eq('business_id', businessId)
    .order('date', { ascending: false })

  if (branchId) {
    supabaseQuery = supabaseQuery.eq('branch_id', branchId)
  }

  if (type) {
    supabaseQuery = supabaseQuery.eq('type', type)
  }

  if (startDate) {
    supabaseQuery = supabaseQuery.gte('date', startDate)
  }

  if (endDate) {
    supabaseQuery = supabaseQuery.lte('date', endDate)
  }

  if (limit) {
    supabaseQuery = supabaseQuery.limit(limit)
  }

  const { data, error } = await supabaseQuery

  if (error) throw error

  return data || []
}

export async function fetchTransactionById(businessId: string, transactionId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      sale_items (*),
      expense (*),
      transfer (*)
    `)
    .eq('business_id', businessId)
    .eq('id', transactionId)
    .single()

  if (error) throw error

  return data
}

export async function fetchTransactionsByDateRange(
  businessId: string,
  branchId: string | undefined,
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      type,
      payment_account,
      date,
      amount,
      display_name,
      sale_items (
        product_id,
        product_name,
        quantity,
        unit_price,
        total_amount
      )
    `)
    .eq('business_id', businessId)
    .eq('type', 'sale')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (branchId) {
    supabaseQuery = supabaseQuery.eq('branch_id', branchId)
  }

  if (error) throw error

  return data || []
}
