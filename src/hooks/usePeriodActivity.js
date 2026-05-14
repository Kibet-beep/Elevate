// src/hooks/usePeriodActivity.js
import { useState, useEffect } from 'react'
import { getDb } from '../lib/db'
import { useInstantAuth } from './useInstantAuth'
import { useBranchContext } from '../context/BranchContext'
import { enrichTransactions, computeSummary } from '../utils/dashboard.transforms'
import { getPeriodRange, getSelectedDayRange } from '../utils/dashboard.time'

export function usePeriodActivity() {
  const { business } = useInstantAuth()
  const { effectiveBranchId } = useBranchContext()
  const [period, setPeriod] = useState('Week')
  const [selectedDay, setSelectedDay] = useState(null)
  const [periodTransactions, setPeriodTransactions] = useState([])
  const [periodSummary, setPeriodSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!business?.id) {
      setPeriodTransactions([])
      setPeriodSummary(null)
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
              setPeriodTransactions(enriched)
              setPeriodSummary(computeSummary(enriched))
              setLoading(false)
            },
            error: (err) => {
              if (!active) return
              console.error('Period transaction subscription error:', err)
              setLoading(false)
            },
          })
      } catch (err) {
        if (!active) return
        console.error('Failed to initialize period activity:', err)
        setLoading(false)
      }
    }

    init()

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [business?.id, effectiveBranchId, period])

  const selectedDayRange = getSelectedDayRange(selectedDay, { transactions: periodTransactions })

  return {
    period,
    selectedDay,
    setPeriod,
    setSelectedDay,
    periodTransactions,
    periodSummary,
    selectedDayRange,
    loading
  }
}
