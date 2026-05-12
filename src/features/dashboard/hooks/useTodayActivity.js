// src/features/dashboard/hooks/useTodayActivity.js
import { useState, useEffect, useMemo, useCallback } from 'react'
import { getDb } from '../../../lib/db'
import { enrichTransactions, computeSummary } from '../utils/dashboard.transforms'

export function useTodayActivity(dashboard) {
  const { business, branchId } = dashboard
  const [todayTransactions, setTodayTransactions] = useState([])
  const [todaySummary, setTodaySummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Memoize date range to prevent recalculation with better timezone handling
  const dateRange = useMemo(() => {
    const now = new Date()
    
    // Get start of day in local timezone (midnight)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    today.setHours(0, 0, 0, 0)
    const todayStart = today.toISOString()
    
    // End of day (23:59:59) to be inclusive
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    endOfDay.setHours(23, 59, 59, 999)
    const todayEnd = endOfDay.toISOString()
    
    return { todayStart, todayEnd }
  }, [])

  // Memoize selector to prevent object recreation (exclude dateRange to avoid resets)
  const selector = useMemo(() => ({
    business_id: business.id,
    _deleted: { $ne: true },
    ...(branchId ? { branch_id: branchId } : {}),
  }), [business.id, branchId])

  // Memoize date filter separately to apply in subscription
  const dateFilter = useMemo(() => ({
    $gte: dateRange.todayStart,
    $lt: dateRange.todayEnd,
  }), [dateRange])

  // Optimize transaction processing
  const processTransactions = useCallback((docs) => {
    const rawTransactions = docs.map(doc => doc.toJSON())
    const enriched = enrichTransactions(rawTransactions)
    const summary = computeSummary(enriched)
    return { enriched, summary }
  }, [])

  useEffect(() => {
    let active = true
    let subscription = null

    const init = async () => {
      if (!active || !business?.id) return
      
      try {
        setLoading(true)
        const db = await getDb()

        // Transaction replication is started at app level (AppInitializer)
        // to avoid duplicate realtime subscriptions

        // Subscribe to real-time transaction updates
        subscription = db.transactions
          .find({
            selector: {
              ...selector,
              // Bypass date filtering to show all transactions
              // date: dateFilter,
            },
            sort: [{ date: 'desc' }, { id: 'desc' }],
          })
          .$
          .subscribe({
            next: (docs) => {
              if (!active) return
              const { enriched, summary } = processTransactions(docs)
              setTodayTransactions(enriched)
              setTodaySummary(summary)
              setLoading(false)
            },
            error: (err) => {
              if (!active) return
              console.error('Transaction subscription error:', err)
              setError(err)
              setLoading(false)
              // Don't re-throw to prevent app crash
            },
          })
      } catch (err) {
        if (!active) return
        console.error('Failed to initialize today activity:', err)
        setError(err)
        setLoading(false)
      }
    }

    init()

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [business?.id, branchId, selector, dateFilter, processTransactions])

  return { todayTransactions, todaySummary, loading, error }
}
