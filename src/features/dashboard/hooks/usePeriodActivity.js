// src/features/dashboard/hooks/usePeriodActivity.js
import { useState, useEffect } from 'react'
import { useDashboardContext } from './useDashboardContext'
import { fetchPeriodActivity } from '../services/dashboard.service'
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

    const fetchPeriodData = async () => {
      if (!active) return
      setLoading(true)
      setError(null)
      
      try {
        const { start, end } = getPeriodRange(period)
        const result = await fetchPeriodActivity({
          businessId: business.id,
          branchId,
          start,
          end,
        })

        if (!active) return
        const enriched = enrichTransactions(result.transactions)
        setPeriodTransactions(enriched)
        setPeriodSummary(computeSummary(enriched))
      } catch (err) {
        if (!active) return
        setError(err)
      } finally {
        if (!active) return
        setLoading(false)
      }
    }

    if (business?.id) {
      fetchPeriodData()
    }

    return () => {
      active = false
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
