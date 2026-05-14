// src/hooks/useHistoricalSales.ts
import { useState, useEffect } from 'react'
import { fetchHistoricalSales, StagedHistoricalSale } from '../services/salesService'
import { useBranchContext } from '../context/BranchContext'
import { useInstantAuth } from './useInstantAuth'

export interface UseHistoricalSalesResult {
  sales: any[]
  salesByDate: Record<string, any[]>
  loading: boolean
  error: string | null
  selectedDate: string | null
  setSelectedDate: (date: string | null) => void
  selectedDaySales: any[]
  reload: () => Promise<void>
}

export function useHistoricalSales(startDate?: string, endDate?: string): UseHistoricalSalesResult {
  const { business } = useInstantAuth()
  const { canViewAll, effectiveBranchId } = useBranchContext()

  const [sales, setSales] = useState<any[]>([])
  const [salesByDate, setSalesByDate] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const fetchSalesData = async () => {
    if (!business?.id) {
      setError('Business not ready')
      setLoading(false)
      return
    }

    if (!effectiveBranchId) {
      if (business?.role === 'owner') {
        setError('Select a branch to view sales')
      } else {
        setError('Your branch is not assigned yet. Contact the owner.')
      }
      setLoading(false)
      return
    }

    try {
      setError(null)
      setLoading(true)

      const result = await fetchHistoricalSales({
        businessId: business.id,
        branchId: canViewAll ? effectiveBranchId || undefined : effectiveBranchId,
        startDate,
        endDate,
      })

      setSales(result.sales)
      setSalesByDate(result.salesByDate)
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch historical sales')
      console.error('Error fetching historical sales:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchSalesData()
  }, [business?.id, effectiveBranchId, canViewAll, startDate, endDate])

  const selectedDaySales = selectedDate ? salesByDate[selectedDate] || [] : []

  return {
    sales,
    salesByDate,
    loading,
    error,
    selectedDate,
    setSelectedDate,
    selectedDaySales,
    reload: fetchSalesData,
  }
}
