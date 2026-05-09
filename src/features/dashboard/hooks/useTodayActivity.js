// src/features/dashboard/hooks/useTodayActivity.js
import { useState, useEffect } from 'react'
import { useDashboardContext } from './useDashboardContext'
import { fetchTodayActivity } from '../services/dashboard.service'
import { enrichTransactions, computeSummary } from '../utils/dashboard.transforms'

export function useTodayActivity(dashboard) {
  const { business, branchId } = dashboard
  const [todayTransactions, setTodayTransactions] = useState([])
  const [todaySummary, setTodaySummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    const fetchTodayData = async () => {
      if (!active) return
      setLoading(true)
      setError(null)
      
      try {
        const result = await fetchTodayActivity({
          businessId: business.id,
          branchId,
        })

        if (!active) return
        const enriched = enrichTransactions(result.transactions)
        setTodayTransactions(enriched)
        setTodaySummary(computeSummary(enriched))
      } catch (err) {
        if (!active) return
        setError(err)
      } finally {
        if (!active) return
        setLoading(false)
      }
    }

    if (business?.id) {
      fetchTodayData()
    }

    return () => {
      active = false
    }
  }, [business?.id, branchId])

  return { todayTransactions, todaySummary, loading, error }
}
