// src/services/saleEntryService.ts
import { getDb } from '../lib/db'
import { createInventoryMovementsForSale } from './inventoryService'

export interface SaleCartItem {
  product_id: string
  name: string
  unit_price: number
  vat_type?: string
  quantity: number
  max_quantity?: number
}

export interface RecordSaleParams {
  businessId: string
  branchId: string
  userId: string
  saleDate: string
  paymentAccount: string
  total: number
  cartItems: SaleCartItem[]
  etimsNo?: string
}

export async function recordSale(params: RecordSaleParams) {
  const {
    businessId,
    branchId,
    userId,
    saleDate,
    paymentAccount,
    total,
    cartItems,
    etimsNo,
  } = params

  if (!businessId) throw new Error('businessId required')
  if (!branchId) throw new Error('branchId required')
  if (!userId) throw new Error('userId required')
  if (!cartItems.length) throw new Error('At least one cart item is required')

  const db = await getDb()

  const transactionId =
    crypto.randomUUID?.() ||
    `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const transaction = {
    id: transactionId,
    business_id: businessId,
    branch_id: branchId,
    type: 'sale',
    transaction_type_tag: 'income',
    payment_account: paymentAccount,
    account_code: '4100',
    date: saleDate,
    created_by: userId,
    lifecycle_state: 'finalized',
    amount: total,
    display_name:
      cartItems.length > 1
        ? `${cartItems[0].name} + ${cartItems.length - 1} more`
        : cartItems[0].name || 'Sale',
    sale_items: cartItems.map((item) => ({
      product_id: item.product_id,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_amount: item.unit_price * item.quantity,
      vat_applied: item.vat_type !== 'exempt' ? 1 : 0,
      etims_receipt_no: etimsNo || null,
    })),
    _modified: Date.now(),
    _deleted: false,
  }

  await db.transactions.insert(transaction)

  const quantityByProduct = new Map<string, number>()
  for (const item of cartItems) {
    quantityByProduct.set(
      item.product_id,
      (quantityByProduct.get(item.product_id) || 0) + Number(item.quantity || 0),
    )
  }

  for (const [productId, soldQuantity] of quantityByProduct.entries()) {
    const productDoc = await db.products.findOne(productId).exec()

    if (!productDoc) continue

    const nextQuantity = Math.max(0, Number(productDoc.current_quantity || 0) - soldQuantity)

    await productDoc.incrementalPatch({
      current_quantity: nextQuantity,
      _modified: Date.now(),
    })
  }

  await createInventoryMovementsForSale(
    businessId,
    branchId,
    transactionId,
    cartItems.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_amount: item.unit_price * item.quantity,
    })),
    userId,
  )

  return {
    transaction,
    transactionId,
  }
}

export default {
  recordSale,
}
