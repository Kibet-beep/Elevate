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

    getDb().then((db) => {
      replication = startTransactionsReplication(db.transactions, business.id)

      const selector = {
        business_id: business.id,
        _deleted: { $ne: true },
        ...(branchId ? { branch_id: branchId } : {}),
      }

      subscription = db.transactions
        .find({ selector, sort: [{ date: 'desc' }] })
        .$.subscribe((docs) => {
          setTransactions(docs.map(d => d.toJSON()))
          setLoading(false)
        })
      })

    return () => {
      subscription?.unsubscribe()
      replication?.cancel()
    }
  }, [business?.id, branchId])

  return { transactions, loading }
}