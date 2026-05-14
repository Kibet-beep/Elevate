// src/services/transferService.ts
import { getDb } from '../lib/db'

const TRANSFER_COSTS = {
  'cash-mpesa': false,
  'cash-bank': false,
  'mpesa-cash': true,
  'mpesa-bank': true,
  'bank-cash': true,
  'bank-mpesa': false,
}

export interface RecordTransferParams {
  businessId: string
  branchId: string
  userId: string
  fromAccount: string
  toAccount: string
  amount: number
  transactionCost?: number
  date: string
  note?: string
}

export async function recordTransfer(params: RecordTransferParams) {
  const {
    businessId,
    branchId,
    userId,
    fromAccount,
    toAccount,
    amount,
    transactionCost = 0,
    date,
    note,
  } = params

  // Validation
  if (!businessId) throw new Error('businessId required')
  if (!branchId) throw new Error('branchId required')
  if (!userId) throw new Error('userId required')
  if (!fromAccount) throw new Error('fromAccount required')
  if (!toAccount) throw new Error('toAccount required')
  if (fromAccount === toAccount) throw new Error('From and To accounts must be different')
  if (amount <= 0) throw new Error('Amount must be greater than zero')
  if (transactionCost < 0) throw new Error('Transaction cost cannot be negative')
  if (transactionCost > amount) throw new Error('Transaction cost cannot exceed transfer amount')

  const db = await getDb()

  const transferId =
    crypto.randomUUID?.() ||
    `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const accountLabel = (acc: string) => {
    if (acc === 'mpesa') return 'M-Pesa'
    return acc.charAt(0).toUpperCase() + acc.slice(1)
  }

  const transfer = {
    id: transferId,
    business_id: businessId,
    branch_id: branchId,
    from_account: fromAccount,
    to_account: toAccount,
    amount,
    transaction_cost: transactionCost,
    date,
    note: note || null,
    created_by: userId,
  }

  const transaction = {
    id: transferId,
    business_id: businessId,
    branch_id: branchId,
    type: 'transfer',
    transaction_type_tag: 'internal_transfer',
    payment_account: fromAccount,
    account_code: '0000',
    date,
    created_by: userId,
    lifecycle_state: 'finalized',
    amount,
    display_name: `Transfer ${accountLabel(fromAccount)} → ${accountLabel(toAccount)}`,
    _modified: Date.now(),
    _deleted: false,
    transfer,
  }

  let costExpense = null
  const transferKey = `${fromAccount}-${toAccount}`
  const hasCost = TRANSFER_COSTS[transferKey as keyof typeof TRANSFER_COSTS]

  if (hasCost && transactionCost > 0) {
    const txnId =
      crypto.randomUUID?.() ||
      `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    costExpense = {
      transaction: {
        id: txnId,
        business_id: businessId,
        branch_id: branchId,
        type: 'expense',
        transaction_type_tag: 'operating_expense',
        payment_account: fromAccount,
        account_code: '6600',
        date,
        created_by: userId,
        lifecycle_state: 'finalized',
        amount: transactionCost,
        display_name: 'Transfer cost',
        _modified: Date.now(),
        _deleted: false,
      },
      expense: {
        transaction_id: txnId,
        category: 'Transfer cost',
        amount: transactionCost,
        description: `Transfer cost: ${accountLabel(fromAccount)} → ${accountLabel(toAccount)}`,
      },
    }
  }

  // Optimistic insert: main transaction record
  if (costExpense) {
    transaction.costExpense = costExpense
  }

  await db.transactions.insert(transaction)

  // If there's a cost expense, also insert it
  if (costExpense) {
    await db.transactions.insert(costExpense.transaction)
  }

  return {
    transfer,
    transaction,
    costExpense,
    amountReceived: amount - transactionCost,
  }
}

export function getTransferCostFlag(fromAccount: string, toAccount: string): boolean {
  const key = `${fromAccount}-${toAccount}`
  return TRANSFER_COSTS[key as keyof typeof TRANSFER_COSTS] || false
}
