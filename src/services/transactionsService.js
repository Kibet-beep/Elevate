// src/services/transactionsService.js
import { getAllTransactions, getTransactionById } from '../repositories/transactionsRepository'

export async function listTransactions(filters = {}) {
  const rows = await getAllTransactions(filters)
  return rows.map((transaction) => normalizeTransaction(transaction)).filter(Boolean)
}

export async function fetchTransaction(transactionId) {
  if (!transactionId) return null
  const transaction = await getTransactionById(transactionId)
  return normalizeTransaction(transaction)
}

function normalizeTransaction(transaction) {
  if (!transaction || !['sale', 'expense'].includes(transaction.type)) {
    return null
  }

  if (transaction.type === 'sale') {
    const saleItems = Array.isArray(transaction.sale_items) ? transaction.sale_items : []
    const amount =
      transaction.amount ??
      saleItems.reduce((sum, item) => sum + Number(item?.total_amount || 0), 0)

    const displayName =
      transaction.display_name ||
      (saleItems.length > 1
        ? `${saleItems[0]?.products?.name || 'Sale'} +${saleItems.length - 1} more`
        : saleItems[0]?.products?.name || 'Sale')

    return {
      ...transaction,
      amount: Number(amount || 0),
      display_name: displayName,
      lifecycle_state: transaction.lifecycle_state || 'completed',
    }
  }

  if (transaction.type === 'expense') {
    const expenses = Array.isArray(transaction.expenses) ? transaction.expenses : []
    const amount =
      transaction.amount ??
      expenses.reduce((sum, item) => sum + Number(item?.amount || 0), 0)

    const displayName = transaction.display_name || expenses[0]?.category || 'Expense'

    return {
      ...transaction,
      amount: Number(amount || 0),
      display_name: displayName,
      lifecycle_state: transaction.lifecycle_state || 'completed',
    }
  }

  return null
}

export default {
  listTransactions,
  fetchTransaction,
}
