// src/lib/syncEngine.js
// Processes the outbox queue and syncs pending writes to Supabase

import { supabase } from './supabase'
import { getPending, markDone, markFailed, requeueFailed } from './outbox'
import { invalidateCacheAfterSync } from './cacheKeys'

let isSyncing = false

function requireBranchId(record, type) {
  if (!record?.branch_id) {
    throw new Error(`${type} requires branch_id`)
  }
}

async function processSale(payload) {
  // 1. Insert the transaction
  const { data: txn, error: txnError } = await supabase
    .from('transactions')
    .insert({
      id:                   payload.transaction.id,
      business_id:          payload.transaction.business_id,
      branch_id:            payload.transaction.branch_id,
      type:                 'sale',
      transaction_type_tag: 'income',
      payment_account:      payload.transaction.payment_account,
      account_code:         '4100',
      date:                 payload.transaction.date,
      created_by:           payload.transaction.created_by,
    })
    .select()
    .single()

  if (txnError) throw new Error(txnError.message)

  // 2. Insert sale items
  const items = payload.saleItems.map(item => ({
    ...item,
    transaction_id: txn.id,
  }))

  const { error: itemsError } = await supabase
    .from('sale_items')
    .insert(items)

  if (itemsError) throw new Error(itemsError.message)

  // 3. Decrement stock for each item
  await Promise.all(
    payload.saleItems.map(item =>
      supabase.rpc('decrement_stock', {
        product_id: item.product_id,
        amount:     item.quantity,
      })
    )
  )
}

async function processExpense(payload) {
  requireBranchId(payload.transaction, 'CREATE_EXPENSE')

  const { data: txn, error: txnError } = await supabase
    .from('transactions')
    .insert({
      id:                   payload.transaction.id,
      business_id:          payload.transaction.business_id,
      branch_id:            payload.transaction.branch_id,
      type:                 'expense',
      transaction_type_tag: payload.transaction.transaction_type_tag,
      payment_account:      payload.transaction.payment_account,
      account_code:         payload.transaction.account_code,
      date:                 payload.transaction.date,
      created_by:           payload.transaction.created_by,
    })
    .select()
    .single()

  if (txnError) throw new Error(txnError.message)

  const { error: expError } = await supabase
    .from('expenses')
    .insert({
      ...payload.expense,
      transaction_id: txn.id,
    })

  if (expError) throw new Error(expError.message)
}

async function processTransfer(payload) {
  requireBranchId(payload.transfer, 'CREATE_TRANSFER')

  const { error: transferError } = await supabase
    .from('transfers')
    .insert(payload.transfer)

  if (transferError) throw new Error(transferError.message)

  if (payload.costExpense) {
    requireBranchId(payload.costExpense.transaction, 'CREATE_TRANSFER_COST_EXPENSE')

    const { data: txn, error: txnError } = await supabase
      .from('transactions')
      .insert(payload.costExpense.transaction)
      .select()
      .single()

    if (txnError) throw new Error(txnError.message)

    const { error: expError } = await supabase
      .from('expenses')
      .insert({
        ...payload.costExpense.expense,
        transaction_id: txn.id,
      })

    if (expError) throw new Error(expError.message)
  }
}

async function processStockEntry(payload) {
  let productId

  if (payload.isNewProduct) {
    const { data: newProduct, error: productError } = await supabase
      .from('products')
      .insert(payload.newProductData)
      .select()
      .single()

    if (productError) throw new Error(productError.message)
    productId = newProduct.id
  } else {
    const { error: updateError } = await supabase
      .from('products')
      .update({
        buying_price:  payload.productUpdate.buying_price,
        selling_price: payload.productUpdate.selling_price,
        vat_type:      payload.productUpdate.vat_type,
      })
      .eq('id', payload.productUpdate.id)

    if (updateError) throw new Error(updateError.message)
    productId = payload.productUpdate.id
  }

  const { error: entryError } = await supabase
    .from('stock_entries')
    .insert({ ...payload.stockEntry, product_id: productId })

  if (entryError) throw new Error(entryError.message)

  const { data: currentProduct } = await supabase
    .from('products')
    .select('current_quantity')
    .eq('id', productId)
    .single()

  const newQuantity = (currentProduct?.current_quantity || 0) + payload.qty

  const { error: qtyError } = await supabase
    .from('products')
    .update({ current_quantity: newQuantity })
    .eq('id', productId)

  if (qtyError) throw new Error(qtyError.message)
}

async function processStockTake(payload) {
  requireBranchId(payload.stockTake, 'CREATE_STOCK_TAKE')

  const { error } = await supabase
    .from('stock_takes')
    .insert(payload.stockTake)

  if (error) throw new Error(error.message)
}

async function processStockTakeCounts(payload) {
  const { error: itemsError } = await supabase
    .from('stock_take_items')
    .insert(payload.items)

  if (itemsError) throw new Error(itemsError.message)

  const { error: updateError } = await supabase
    .from('stock_takes')
    .update({ status: 'variance_review' })
    .eq('id', payload.stockTakeId)

  if (updateError) throw new Error(updateError.message)
}

async function processApproveStockTake(payload) {
  const { error } = await supabase
    .from('stock_takes')
    .update({
      status: 'approved',
      approved_by: payload.approvedBy,
      end_date: payload.endDate,
    })
    .eq('id', payload.stockTakeId)

  if (error) throw new Error(error.message)
}

async function processItem(item) {
  switch (item.type) {
    case 'CREATE_SALE':
      await processSale(item.payload)
      break

    case 'CREATE_EXPENSE':
      await processExpense(item.payload)
      break

    case 'CREATE_TRANSFER':
      await processTransfer(item.payload)
      break

    case 'CREATE_STOCK_TAKE':
      await processStockTake(item.payload)
      break

    case 'SUBMIT_STOCK_TAKE_COUNTS':
      await processStockTakeCounts(item.payload)
      break

    case 'APPROVE_STOCK_TAKE':
      await processApproveStockTake(item.payload)
      break

    case 'CREATE_STOCK_ENTRY':
      await processStockEntry(item.payload)
      break

    // More types (CREATE_EXPENSE, etc.) will be added in later steps
    default:
      console.warn('syncEngine: unknown outbox type:', item.type)
  }
}

export async function runSync() {
  if (isSyncing) return
  if (!navigator.onLine) return

  isSyncing = true

  // Reset any previously failed items so they get retried
  requeueFailed()

  const pending = getPending()

  for (const item of pending) {
    try {
      await processItem(item)
      markDone(item.id)
      invalidateCacheAfterSync(item.type, item.payload, { invalidate: () => {} })
    } catch (err) {
      console.warn('syncEngine: failed to process item', item.id, err.message)
      markFailed(item.id)
    }
  }

  isSyncing = false
}
