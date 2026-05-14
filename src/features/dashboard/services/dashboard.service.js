// src/features/dashboard/services/dashboard.service.js
import { getDb } from '../../../lib/db'

export const DASHBOARD_CACHE_KEY = 'elevate:dashboard:cache'

function toPlainDoc(doc) {
  return typeof doc?.toJSON === 'function' ? doc.toJSON() : doc
}

function getTodayRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  start.setHours(0, 0, 0, 0)

  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  end.setHours(23, 59, 59, 999)

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

function buildSelector(businessId, branchId, start, end) {
  const selector = {
    business_id: businessId,
    _deleted: { $ne: true },
    date: {
      $gte: start,
      $lte: end,
    },
  }

  if (branchId) {
    selector.branch_id = branchId
  }

  return selector
}

async function loadTransactions({ businessId, branchId, start, end }) {
  if (!businessId) {
    return []
  }

  const db = await getDb()
  const docs = await db.transactions
    .find({
      selector: buildSelector(businessId, branchId, start, end),
      sort: [{ date: 'desc' }, { id: 'desc' }],
    })
    .exec()

  return docs.map(toPlainDoc)
}

function splitTransactions(transactions) {
  const sales = []
  const expenses = []

  for (const transaction of transactions) {
    if (transaction.type === 'sale') {
      sales.push(transaction)
    }

    if (transaction.type === 'expense') {
      expenses.push({
        ...transaction,
        expenses: transaction.expense ? [transaction.expense] : [],
      })
    }
  }

  return { sales, expenses }
}

export async function fetchDashboardStats(params) {
  const { businessId, branchId } = params

  const { start, end } = getTodayRange()
  const transactions = await loadTransactions({ businessId, branchId, start, end })
  const { sales, expenses } = splitTransactions(transactions)

  return { txns: sales, expenses }
}

export async function fetchTodayActivity(params) {
  const { businessId, branchId } = params

  const { start, end } = getTodayRange()
  const transactions = await loadTransactions({ businessId, branchId, start, end })
  const { sales, expenses } = splitTransactions(transactions)

  return { transactions: [...sales, ...expenses] }
}

export async function fetchPeriodActivity(params) {
  const { businessId, branchId, start, end } = params

  const transactions = await loadTransactions({ businessId, branchId, start, end })
  const { sales, expenses } = splitTransactions(transactions)

  return { transactions: [...sales, ...expenses] }
}
