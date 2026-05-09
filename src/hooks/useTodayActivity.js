// src/hooks/useTodayActivity.js
import { useState, useEffect } from 'react'
import { useInstantAuth } from './useInstantAuth'
import { useBranchContext } from '../context/BranchContext'
import { fetchTodayActivity } from '../services/dashboard.service'
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

    const fetchTodayData = async () => {
      setLoading(true)
      
      const result = await fetchTodayActivity({
        businessId: business.id,
        branchId: effectiveBranchId,
      })

      const enriched = enrichTransactions(result.txns)
      setTodayTransactions(enriched)
      setTodaySummary(computeSummary(enriched, result.expenses))
      setLoading(false)
    }

    useEffect(() => {
      if (business && effectiveBranchId) {
        fetchTodayData()
      }
    }, [business?.id, effectiveBranchId])

    return { todayTransactions, todaySummary, loading }
  }
