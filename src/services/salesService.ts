// src/services/salesService.ts
import { supabase } from '../lib/supabase'
import { createInventoryMovementsForSale } from './inventoryService'

export interface SaleItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_amount: number
  vat_applied?: number
  etims_receipt_no?: string | null
}

export interface StagedHistoricalSale {
  id: string
  date: string
  payment_account: string
  items: SaleItem[]
  total: number
}

export interface CommitHistoricalSalesParams {
  businessId: string
  branchId: string
  userId: string
  stagedTransactions: StagedHistoricalSale[]
}

export function stageHistoricalSale(
  productId: string,
  productName: string,
  quantity: number,
  unitPrice: number,
  existingCart: SaleItem[] = []
): SaleItem[] {
  const existingItemIndex = existingCart.findIndex(item => item.product_id === productId)
  
  if (existingItemIndex >= 0) {
    // Update existing item
    const updatedCart = [...existingCart]
    updatedCart[existingItemIndex] = {
      ...updatedCart[existingItemIndex],
      quantity: updatedCart[existingItemIndex].quantity + quantity,
      total_amount: (updatedCart[existingItemIndex].quantity + quantity) * unitPrice,
    }
    return updatedCart
  } else {
    // Add new item
    return [
      ...existingCart,
      {
        product_id: productId,
        product_name: productName,
        quantity,
        unit_price: unitPrice,
        total_amount: quantity * unitPrice,
        vat_applied: 0, // Default, can be overridden
        etims_receipt_no: null,
      }
    ]
  }
}

export async function commitHistoricalSales(params: CommitHistoricalSalesParams) {
  const { businessId, userId, stagedTransactions } = params

  if (!stagedTransactions.length) return {
    total: 0,
    successful: 0,
    failed: 0,
    results: [],
  }

  const touchedBranches = new Set<string>()

  for (const stagedSale of stagedTransactions) {
    const transactionDate = new Date(`${stagedSale.date}T12:00:00Z`).toISOString()

    const total = stagedSale.items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    )

    // 1. parent transaction
    const { data: txn, error: txnError } = await supabase
      .from('transactions')
      .insert({
        business_id: businessId,
        branch_id: stagedSale.branchId,
        type: 'sale',
        transaction_type_tag: 'income',
        payment_account: stagedSale.payment_account,
        account_code: '4100',
        amount: total,
        date: transactionDate,
        created_by: userId,
      })
      .select()
      .single()

    if (txnError) throw txnError

    // 2. sale items
    const saleItems = stagedSale.items.map(item => ({
      transaction_id: txn.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_amount: item.quantity * item.unit_price,
      vat_applied: 0,
    }))

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems)

    if (itemsError) throw itemsError

    // 3. inventory movements
    const movements = stagedSale.items.map(item => ({
      business_id: businessId,
      branch_id: stagedSale.branchId,
      product_id: item.product_id,
      movement_type: 'sale',
      quantity_delta: -Math.abs(item.quantity),
      unit_cost: item.unit_price,
      reference_id: txn.id,
      reference_type: 'transaction',
      movement_date: transactionDate,
      created_by: userId,
    }))

    const { error: movementError } = await supabase
      .from('inventory_movements')
      .insert(movements)

    if (movementError) throw movementError

    touchedBranches.add(stagedSale.branchId)
  }

  // 4. recalc once per branch (not once per item)
  for (const branchId of touchedBranches) {
    await recalculateBranchInventory(businessId, branchId)
  }

  return {
    total: stagedTransactions.length,
    successful: stagedTransactions.length,
    failed: 0,
    results: stagedTransactions.map(staged => ({
      success: true,
      transactionId: txn.id,
      saleId: staged.id,
      itemsCount: staged.items.length,
    })),
  }
}

export async function fetchHistoricalSales(params: {
  businessId: string
  branchId?: string
  startDate?: string
  endDate?: string
}) {
  const { businessId, branchId, startDate, endDate } = params

  let query = supabase
    .from('transactions')
    .select(`
      id,
      date,
      payment_account,
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
    .order('date', { ascending: false })

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  if (startDate) {
    query = query.gte('date', startDate)
  }

  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data, error } = await query

  if (error) throw error

  // Group by date for easier UI consumption
  const salesByDate = new Map<string, any[]>()

  data?.forEach(sale => {
    const date = sale.date
    if (!salesByDate.has(date)) {
      salesByDate.set(date, [])
    }
    salesByDate.get(date)!.push(sale)
  })

  return {
    sales: data || [],
    salesByDate: Object.fromEntries(salesByDate),
  }
}
