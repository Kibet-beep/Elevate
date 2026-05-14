// src/hooks/useBranchScopedProducts.ts
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useBranchContext } from '../context/BranchContext'
import { useInstantAuth } from './useInstantAuth'

export interface Product {
  id: string
  name: string
  sku_id?: string
  category?: string
  unit_of_measure?: string
  current_quantity: number
  buying_price?: number
  selling_price?: number
  is_active: boolean
  business_id: string
  branch_id: string
  created_at: string
  updated_at: string
}

export interface UseBranchScopedProductsResult {
  products: Product[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

export function useBranchScopedProducts(): UseBranchScopedProductsResult {
  const { business } = useInstantAuth()
  const { canViewAll, effectiveBranchId } = useBranchContext()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = async () => {
    if (!business?.id) {
      setError('Business not ready')
      setLoading(false)
      return
    }

    if (!effectiveBranchId) {
      if (business?.role === 'owner') {
        setError('Select a branch to view products')
      } else {
        setError('Your branch is not assigned yet. Contact the owner.')
      }
      setLoading(false)
      return
    }

    try {
      setError(null)
      setLoading(true)

      let query = supabase
        .from('products')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)

      // Apply branch scoping
      if (canViewAll) {
        if (effectiveBranchId) {
          query = query.eq('branch_id', effectiveBranchId)
        }
      } else {
        query = query.eq('branch_id', effectiveBranchId)
      }

      const { data, error: fetchError } = await query.order('name', { ascending: true })

      if (fetchError) throw fetchError

      setProducts(data || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch products')
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchProducts()
  }, [business?.id, effectiveBranchId, canViewAll])

  return {
    products,
    loading,
    error,
    reload: fetchProducts,
  }
}
