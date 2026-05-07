import { useState, useEffect } from 'react'
import { getDb, startTransactionsReplication } from '../lib/db'
import { useInstantAuth } from './useInstantAuth'

export function useTransactions(branchId = null) {
  const { business } = useInstantAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!business?.id) return

    let subscription
    let replication
    let active = true

    getDb().then((db) => {
      if (!active) return

      replication = startTransactionsReplication(db.transactions, business.id)

      const selector = {
        business_id: business.id,
        _deleted: { $ne: true },
        ...(branchId ? { branch_id: branchId } : {}),
      }

      subscription = db.transactions
        .find({ selector, sort: [{ date: 'desc' }, { id: 'desc' }] })
        .$
        .subscribe((docs) => {
          if (!active) return
          setTransactions(docs.map((doc) => {
            const transaction = doc.toJSON()
            if (!['sale', 'expense'].includes(transaction.type)) return null
            const saleItems = Array.isArray(transaction.sale_items) ? transaction.sale_items : []
            const expenses = Array.isArray(transaction.expenses) ? transaction.expenses : []
            const amount = transaction.amount ?? (
              transaction.type === 'sale'
                ? saleItems.reduce((sum, item) => sum + Number(item.total_amount || 0), 0)
                : expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
            ) ?? 0

            return {
              ...transaction,
              amount,
              display_name: transaction.display_name || (transaction.type === 'sale' ? 'Sale' : 'Expense'),
            }
          }).filter(Boolean))
          setLoading(false)
        })
    })

    return () => {
      active = false
      subscription?.unsubscribe()
      replication?.cancel()
    }
  }, [business?.id, branchId])

  return { transactions, loading }
}