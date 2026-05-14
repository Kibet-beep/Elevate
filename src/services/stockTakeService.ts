// src/services/stockTakeService.ts
import { getDb, startTransactionsReplication } from '../lib/db'

export type StockTakeType = 'full' | 'cycle_count' | 'spot_check'

export interface StockTakeItem {
  stock_take_id: string
  product_id: string
  expected_quantity: number
  actual_quantity: number
}

export interface StartStockTakeParams {
  businessId: string
  branchId: string
  userId: string
  type: StockTakeType
}

export interface SubmitCountsParams {
  businessId: string
  branchId: string
  userId: string
  stockTakeId: string
  items: StockTakeItem[]
}

export interface ApproveStockTakeParams {
  businessId: string
  branchId: string
  userId: string
  stockTakeId: string
}

export async function startStockTake(params: StartStockTakeParams) {
  const { businessId, branchId, userId, type } = params

  if (!businessId) throw new Error('businessId required')
  if (!branchId) throw new Error('branchId required')
  if (!userId) throw new Error('userId required')
  if (!type) throw new Error('type required')

  const db = await getDb()
  const newStockTakeId =
    crypto.randomUUID?.() ||
    `stock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const stockTake = {
    id: newStockTakeId,
    business_id: businessId,
    branch_id: branchId,
    type,
    start_date: new Date().toISOString(),
    status: 'counting',
    counted_by: userId,
  }

  await db.transactions.insert({
    id:
      crypto.randomUUID?.() ||
      `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    business_id: businessId,
    branch_id: branchId,
    type: 'stock_take_create',
    transaction_type_tag: 'inventory_control',
    payment_account: 'system',
    account_code: '0000',
    date: new Date().toISOString(),
    created_by: userId,
    lifecycle_state: 'finalized',
    amount: 0,
    display_name: 'Stock take create',
    stock_take: stockTake,
    _modified: Date.now(),
    _deleted: false,
  })

  return newStockTakeId
}

export async function submitStockTakeCounts(
  params: SubmitCountsParams
) {
  const { businessId, branchId, userId, stockTakeId, items } = params

  if (!businessId) throw new Error('businessId required')
  if (!branchId) throw new Error('branchId required')
  if (!userId) throw new Error('userId required')
  if (!stockTakeId) throw new Error('stockTakeId required')
  if (!items.length) throw new Error('At least one stock take item required')

  const db = await getDb()

  await db.transactions.insert({
    id:
      crypto.randomUUID?.() ||
      `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    business_id: businessId,
    branch_id: branchId,
    type: 'stock_take_submit_counts',
    transaction_type_tag: 'inventory_control',
    payment_account: 'system',
    account_code: '0000',
    date: new Date().toISOString(),
    created_by: userId,
    lifecycle_state: 'finalized',
    amount: 0,
    display_name: 'Stock take submit counts',
    stock_take_id: stockTakeId,
    stock_take_items: items,
    _modified: Date.now(),
    _deleted: false,
  })
}

export async function approveStockTake(
  params: ApproveStockTakeParams
) {
  const { businessId, branchId, userId, stockTakeId } = params

  if (!businessId) throw new Error('businessId required')
  if (!branchId) throw new Error('branchId required')
  if (!userId) throw new Error('userId required')
  if (!stockTakeId) throw new Error('stockTakeId required')

  const db = await getDb()

  const approvalPayload = {
    stockTakeId,
    approvedBy: userId,
    endDate: new Date().toISOString(),
  }

  await db.transactions.insert({
    id:
      crypto.randomUUID?.() ||
      `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    business_id: businessId,
    branch_id: branchId,
    type: 'stock_take_approve',
    transaction_type_tag: 'inventory_control',
    payment_account: 'system',
    account_code: '0000',
    date: new Date().toISOString(),
    created_by: userId,
    lifecycle_state: 'finalized',
    amount: 0,
    display_name: 'Stock take approve',
    stock_take_approval: approvalPayload,
    _modified: Date.now(),
    _deleted: false,
  })
}
