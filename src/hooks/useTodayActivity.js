// src/hooks/useTodayActivity.js
import { useState, useEffect } from 'react'
import { getDb } from '../lib/db'
import { useInstantAuth } from './useInstantAuth'
import { useBranchContext } from '../context/BranchContext'
import { enrichTransactions, computeSummary } from '../utils/dashboard.transforms'

export function useTodayActivity() {
  const { business } = useInstantAuth()
  const { effectiveBranchId } = useBranchContext()
  const [todayTransactions, setTodayTransactions] = useState([])
  const [todaySummary, setTodaySummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!business?.id) {
      setTodayTransactions([])
      setTodaySummary(null)
      setLoading(false)
      return
    }

    let active = true
    let subscription = null

    const init = async () => {
      try {
        setLoading(true)
        const db = await getDb()

        // Transaction replication is started at app level (AppInitializer)
        // to avoid duplicate realtime subscriptions

        // Get today's date range
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayStart = today.toISOString()
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const todayEnd = tomorrow.toISOString()

        // Build selector for today's transactions
        const selector = {
          business_id: business.id,
          _deleted: { $ne: true },
          date: {
            $gte: todayStart,
            $lt: todayEnd,
          },
          ...(effectiveBranchId ? { branch_id: effectiveBranchId } : {}),
        }

        // Subscribe to real-time transaction updates
        subscription = db.transactions
          .find({
            selector,
            sort: [{ date: 'desc' }, { id: 'desc' }],
          })
          .$
          .subscribe({
            next: (docs) => {
              if (!active) return
              const rawTransactions = docs.map(doc => doc.toJSON())
              const enriched = enrichTransactions(rawTransactions)
              setTodayTransactions(enriched)
              setTodaySummary(computeSummary(enriched))
              setLoading(false)
            },
            error: (err) => {
              if (!active) return
              console.error('Transaction subscription error:', err)
              setLoading(false)
            },
          })
      } catch (err) {
        if (!active) return
        console.error('Failed to initialize today activity:', err)
        setLoading(false)
      }
    }

    init()

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [business?.id, effectiveBranchId])

  return { todayTransactions, todaySummary, loading }
}
