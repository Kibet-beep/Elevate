// src/hooks/usePeriodActivity.js
import { useState, useEffect } from 'react'
import { useInstantAuth } from './useInstantAuth'
import { useBranchContext } from '../context/BranchContext'
import { fetchPeriodActivity } from '../services/dashboard.service'
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

    const fetchPeriodData = async () => {
      setLoading(true)
      
      const { start, end } = getPeriodRange(period)
      const result = await fetchPeriodActivity({
        businessId: business.id,
        branchId: effectiveBranchId,
        start,
        end,
      })

      const enriched = enrichTransactions(result.txns)
      setPeriodTransactions(enriched)
      setPeriodSummary(computeSummary(enriched, result.expenses))
      setLoading(false)
    }

    useEffect(() => {
      if (business && effectiveBranchId) {
        fetchPeriodData()
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
