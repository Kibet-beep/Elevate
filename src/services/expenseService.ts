// src/services/expenseService.ts
import { getDb } from '../lib/db'

export interface RecordExpenseParams {
  businessId: string
  branchId: string
  userId: string
  category: string
  amount: number
  description?: string
  paymentAccount: string
  date: string
}

const ACCOUNT_MAP: Record<string, string> = {
  Rent: '6100',
  Utilities: '6200',
  'Salaries & Wages': '6300',
  Transport: '6400',
  Marketing: '6500',
  'Stock Purchase': '5100',
  Equipment: '1300',
  Miscellaneous: '6600',
}

export async function recordExpense(params: RecordExpenseParams) {
  const {
    businessId,
    branchId,
    userId,
    category,
    amount,
    description,
    paymentAccount,
    date,
  } = params

  if (!businessId) throw new Error('businessId required')
  if (!branchId) throw new Error('branchId required')
  if (!userId) throw new Error('userId required')
  if (!category) throw new Error('category required')
  if (!amount || amount <= 0) throw new Error('amount must be greater than zero')

  const db = await getDb()
  const transactionId =
    crypto.randomUUID?.() ||
    `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const transaction = {
    id: transactionId,
    business_id: businessId,
    branch_id: branchId,
    type: 'expense',
    transaction_type_tag: category === 'Stock Purchase'
      ? 'cost_of_goods_sold'
      : category === 'Equipment'
        ? 'asset_purchase'
        : 'operating_expense',
    payment_account: paymentAccount,
    account_code: ACCOUNT_MAP[category] || '6600',
    date,
    created_by: userId,
    lifecycle_state: 'finalized',
    amount,
    display_name: category,
    expenses: [{
      transaction_id: transactionId,
      category,
      amount,
      description: description || null,
    }],
    _modified: Date.now(),
    _deleted: false,
  }

  await db.transactions.insert(transaction)

  return {
    transaction,
    transactionId,
  }
}

export default {
  recordExpense,
}
