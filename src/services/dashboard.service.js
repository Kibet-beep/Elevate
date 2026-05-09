// src/services/dashboard.service.js
import { supabase } from '../lib/supabase'

export async function fetchDashboardStats(params) {
  const { businessId, branchId } = params
  
  const today = new Date().toISOString().split('T')[0]
  
  const txnsQuery = supabase
    .from('transactions')
    .select('id, type, payment_account, date, sale_items(total_amount), expense(amount)')
    .eq('business_id', businessId)
    .eq('type', 'sale')
    .gte('date', today)
    .order('date', { ascending: false })

  const expensesQuery = supabase
    .from('transactions')
    .select('id, type, payment_account, date, expense(amount, category)')
    .eq('business_id', businessId)
    .eq('type', 'expense')
    .gte('date', today)
    .order('date', { ascending: false })

  const queries = [txnsQuery, expensesQuery]
  if (branchId) {
    queries.forEach(query => query.eq('branch_id', branchId))
  }

  const [txnsResult, expensesResult] = await Promise.all(queries)
  
  const txns = txnsResult?.data || []
  const expenses = expensesResult?.data || []
  
  return { txns, expenses }
}

export async function fetchTodayActivity(params) {
  const { businessId, branchId } = params
  
  const today = new Date().toISOString().split('T')[0]
  
  const txnsQuery = supabase
    .from('transactions')
    .select('id, type, payment_account, date, sale_items(total_amount), expense(amount)')
    .eq('business_id', businessId)
    .eq('type', 'sale')
    .gte('date', today)
    .order('date', { ascending: false })

  const expensesQuery = supabase
    .from('transactions')
    .select('id, type, payment_account, date, expense(amount, category)')
    .eq('business_id', businessId)
    .eq('type', 'expense')
    .gte('date', today)
    .order('date', { ascending: false })

  const queries = [txnsQuery, expensesQuery]
  if (branchId) {
    queries.forEach(query => query.eq('branch_id', branchId))
  }

  const [txnsResult, expensesResult] = await Promise.all(queries)
  
  const txns = txnsResult?.data || []
  const expenses = expensesResult?.data || []
  
  return { txns, expenses }
}

export async function fetchPeriodActivity(params) {
  const { businessId, branchId, start, end } = params
  
  const txnsQuery = supabase
    .from('transactions')
    .select('id, type, payment_account, date, sale_items(total_amount), expense(amount)')
    .eq('business_id', businessId)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false })

  const expensesQuery = supabase
    .from('transactions')
    .select('id, type, payment_account, date, expense(amount, category)')
    .eq('business_id', businessId)
    .eq('type', 'expense')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false })

  const queries = [txnsQuery, expensesQuery]
  if (branchId) {
    queries.forEach(query => query.eq('branch_id', branchId))
  }

  const [txnsResult, expensesResult] = await Promise.all(queries)
  
  const txns = txnsResult?.data || []
  const expenses = expensesResult?.data || []
  
  return { txns, expenses }
}
