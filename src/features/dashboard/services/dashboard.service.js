// src/features/dashboard/services/dashboard.service.js
import { supabase } from '../../../lib/supabase'
import { getTodayStartEAT } from '../utils/dashboard.time'

export async function fetchDashboardStats(params) {
  const { businessId, branchId } = params
  
  const today = getTodayStartEAT()
  
  const txnsQuery = supabase
    .from('transactions')
    .select('id, type, payment_account, date, sale_items(total_amount)')
    .eq('business_id', businessId)
    .eq('type', 'sale')
    .gte('date', today)
    .order('date', { ascending: false })

  const expensesQuery = supabase
    .from('transactions')
    .select('id, type, payment_account, date')
    .eq('business_id', businessId)
    .eq('type', 'expense')
    .gte('date', today)
    .order('date', { ascending: false })

  if (branchId) {
    txnsQuery.eq('branch_id', branchId)
    expensesQuery.eq('branch_id', branchId)
  }

  const [txnsResult, expensesResult] = await Promise.all([txnsQuery, expensesQuery])
  
  if (txnsResult.error) throw txnsResult.error
  if (expensesResult.error) throw expensesResult.error
  
  const txns = txnsResult.data || []
  const expensesByTxn = {}
  
  if (expensesResult.data?.length > 0) {
    const txnIds = expensesResult.data.map(t => t.id)
    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .in('transaction_id', txnIds)
    
    if (expensesError) throw expensesError
    
    if (expensesData) {
      expensesData.forEach(exp => {
        if (!expensesByTxn[exp.transaction_id]) {
          expensesByTxn[exp.transaction_id] = []
        }
        expensesByTxn[exp.transaction_id].push(exp)
      })
    }
  }
  
  const enrichedExpenses = (expensesResult.data || []).map(txn => ({
    ...txn,
    expenses: expensesByTxn[txn.id] || []
  }))
  
  return { txns, expenses: enrichedExpenses }
}

export async function fetchTodayActivity(params) {
  const { businessId, branchId } = params
  
  const today = getTodayStartEAT()
  
  const query = supabase
    .from('transactions')
    .select('id, type, payment_account, date, sale_items(total_amount, products(name))')
    .eq('business_id', businessId)
    .eq('type', 'sale')
    .gte('date', today)
    .order('date', { ascending: false })

  const expenseQuery = supabase
    .from('transactions')
    .select('id, type, payment_account, date')
    .eq('business_id', businessId)
    .eq('type', 'expense')
    .gte('date', today)
    .order('date', { ascending: false })

  if (branchId) {
    query.eq('branch_id', branchId)
    expenseQuery.eq('branch_id', branchId)
  }

  const [txnResult, expenseResult] = await Promise.all([query, expenseQuery])
  
  if (txnResult.error) throw txnResult.error
  if (expenseResult.error) throw expenseResult.error
  
  const txns = txnResult.data || []
  const expensesByTxn = {}
  
  if (expenseResult.data?.length > 0) {
    const txnIds = expenseResult.data.map(t => t.id)
    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .in('transaction_id', txnIds)
    
    if (expensesError) throw expensesError
    
    if (expensesData) {
      expensesData.forEach(exp => {
        if (!expensesByTxn[exp.transaction_id]) {
          expensesByTxn[exp.transaction_id] = []
        }
        expensesByTxn[exp.transaction_id].push(exp)
      })
    }
  }
  
  const enrichedExpenses = (expenseResult.data || []).map(txn => ({
    ...txn,
    expenses: expensesByTxn[txn.id] || []
  }))
  
  return { transactions: [...txns, ...enrichedExpenses] }
}

export async function fetchPeriodActivity(params) {
  const { businessId, branchId, start, end } = params
  
  const query = supabase
    .from('transactions')
    .select('id, type, payment_account, date, sale_items(total_amount, products(name))')
    .eq('business_id', businessId)
    .eq('type', 'sale')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false })

  const expenseQuery = supabase
    .from('transactions')
    .select('id, type, payment_account, date')
    .eq('business_id', businessId)
    .eq('type', 'expense')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false })

  if (branchId) {
    query.eq('branch_id', branchId)
    expenseQuery.eq('branch_id', branchId)
  }

  const [txnResult, expenseResult] = await Promise.all([query, expenseQuery])
  
  if (txnResult.error) throw txnResult.error
  if (expenseResult.error) throw expenseResult.error
  
  const txns = txnResult.data || []
  const expensesByTxn = {}
  
  if (expenseResult.data?.length > 0) {
    const txnIds = expenseResult.data.map(t => t.id)
    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .in('transaction_id', txnIds)
    
    if (expensesError) throw expensesError
    
    if (expensesData) {
      expensesData.forEach(exp => {
        if (!expensesByTxn[exp.transaction_id]) {
          expensesByTxn[exp.transaction_id] = []
        }
        expensesByTxn[exp.transaction_id].push(exp)
      })
    }
  }
  
  const enrichedExpenses = (expenseResult.data || []).map(txn => ({
    ...txn,
    expenses: expensesByTxn[txn.id] || []
  }))
  
  return { transactions: [...txns, ...enrichedExpenses] }
}
