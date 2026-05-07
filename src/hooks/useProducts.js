import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useInstantAuth } from './useInstantAuth'

const CACHE_PREFIX = 'elevate:products:'

export function useProducts(branchId = null, isOwnerOrManager = false) {
  const { business } = useInstantAuth()
  const [products, setProducts] = useState(() => {
    // Load from cache instantly on first render
    try {
      const key = `${CACHE_PREFIX}${business?.id || 'none'}_${branchId || 'all'}` 
      const cached = localStorage.getItem(key)
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!business?.id) return
    if (!isOwnerOrManager && !branchId) {
      setProducts([])
      setLoading(false)
      return
    }

    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, sku_id, category, current_quantity, reorder_point, buying_price, selling_price, unit_of_measure, branch_id')
          .eq('business_id', business.id)
          .eq('branch_id', branchId || '')
          .not('is_active', 'eq', false)
          .order('name')

        if (error) {
          console.error('Products query error:', error)
          setProducts([])
        } else {
          const result = data || []
          console.log('Products fetched:', result.length, 'for branch:', branchId)
          setProducts(result)

          // Cache for next refresh
          try {
            const key = `${CACHE_PREFIX}${business.id}_${branchId || 'all'}` 
            localStorage.setItem(key, JSON.stringify(result))
          } catch {}
        }
      } catch (err) {
        console.error('Failed to fetch products:', err)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()

    // Re-fetch on window focus
    const handleFocus = () => fetchProducts()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [business?.id, branchId, isOwnerOrManager])

  return { products, loading }
}

