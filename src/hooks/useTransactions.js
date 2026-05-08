import { useState, useEffect } from 'react'
import { getDb, startTransactionsReplication } from '../lib/db'
import { useInstantAuth } from './useInstantAuth'

export function useTransactions(branchId = null, isOwnerOrManager = false) {
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

      try {
        replication = startTransactionsReplication(db.transactions, business.id)
      } catch (error) {
        console.error('Failed to start transactions replication:', error)
        setLoading(false)
      }

      const selector = {
        business_id: business.id,
        _deleted: { $ne: true },
        ...(branchId && !isOwnerOrManager ? { branch_id: branchId } : {}),
      }

      subscription = db.transactions
        .find({ selector, sort: [{ date: 'desc' }, { id: 'desc' }] })
        .$
        .subscribe({
          next: (docs) => {
            if (!active) return
            setTransactions(docs.map((doc) => {
              const transaction = doc.toJSON()
              // Only include actual sales and expenses, not operation docs
              if (!['sale', 'expense'].includes(transaction.type)) return null
              
              const saleItems = Array.isArray(transaction.sale_items) ? transaction.sale_items : []
              const amount = transaction.amount ?? (
                transaction.type === 'sale'
                  ? saleItems.reduce((sum, item) => sum + Number(item.total_amount || 0), 0)
                  : 0
              ) ?? 0

              return {
                ...transaction,
                amount,
                display_name: transaction.display_name || (transaction.type === 'sale' ? 'Sale' : 'Expense'),
              }
            }).filter(Boolean))
            setLoading(false)
          },
          error: (error) => {
            console.error('useTransactions subscription error:', error)
            setLoading(false)
          }
        })
    })

    return () => {
      active = false
      subscription?.unsubscribe()
      replication?.cancel()
    }
  }, [business?.id, branchId, isOwnerOrManager])

  return { transactions, loading }
}