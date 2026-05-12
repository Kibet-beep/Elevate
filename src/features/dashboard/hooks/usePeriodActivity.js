// src/features/dashboard/hooks/usePeriodActivity.js
import { useState, useEffect } from 'react'
import { getDb } from '../../../lib/db'
import { enrichTransactions, computeSummary } from '../utils/dashboard.transforms'
import { getPeriodRange, getSelectedDayRange } from '../utils/dashboard.time'

export function usePeriodActivity(dashboard) {
  const { business, branchId } = dashboard
  const [period, setPeriod] = useState('Week')
  const [selectedDay, setSelectedDay] = useState(null)
  const [periodTransactions, setPeriodTransactions] = useState([])
  const [periodSummary, setPeriodSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

        // Get period date range
        const { start, end } = getPeriodRange(period)

        // Build selector for period transactions
        const selector = {
          business_id: business.id,
          _deleted: { $ne: true },
          date: {
            $gte: start,
            $lte: end,
          },
          ...(branchId ? { branch_id: branchId } : {}),
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
              setPeriodTransactions(enriched)
              setPeriodSummary(computeSummary(enriched))
              setLoading(false)
            },
            error: (err) => {
              if (!active) return
              console.error('Period transaction subscription error:', err)
              setError(err)
              setLoading(false)
            },
          })
      } catch (err) {
        if (!active) return
        console.error('Failed to initialize period activity:', err)
        setError(err)
        setLoading(false)
      }
    }

    init()

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [business?.id, branchId, period])

  const selectedDayRange = getSelectedDayRange(selectedDay, { transactions: periodTransactions })

  return {
    period,
    selectedDay,
    setPeriod,
    setSelectedDay,
    periodTransactions,
    periodSummary,
    selectedDayRange,
    loading,
    error
  }
}
