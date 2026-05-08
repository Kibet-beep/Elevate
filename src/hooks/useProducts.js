import { useState, useEffect } from 'react'
import { getDb, startProductsReplication } from '../lib/db'
import { useInstantAuth } from './useInstantAuth'

export function useProducts(branchId = null, isOwnerOrManager = false) {
  const { business } = useInstantAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('useProducts hook:', { business, branchId, isOwnerOrManager })
    if (!business?.id) return

    if (!isOwnerOrManager && !branchId) {
      setProducts([])
      setLoading(false)
      return
    }

    let subscription
    let replication
    let active = true

    getDb().then(async (db) => {
      if (!active) return

      try {
        replication = startProductsReplication(db.products, business.id)
      } catch (error) {
        console.error('Failed to start products replication:', error)
        // Continue without replication - we'll still have cached data
      }

      // Initial data fetch - ensure we have data even if replication is slow
      const selector = {
        business_id: business.id,
        _deleted: { $ne: true },
        // Show active products, or products without is_active set (defaults to active)
        $or: [
          { is_active: true },
          { is_active: null }
        ],
        ...(branchId ? { branch_id: branchId } : {}),
        // For non-owners, ensure they only see active products (default behavior)
        ...(isOwnerOrManager ? {} : {}),
      }

      // Try to get existing data first
      try {
        const existingDocs = await db.products.find({ selector }).exec()
        if (existingDocs.length > 0) {
          setProducts(existingDocs.map((doc) => doc.toJSON()))
          setLoading(false)
        }
      } catch (error) {
        console.error('useProducts initial fetch error:', error)
        setProducts([]) // Set empty array on error to prevent infinite loading
        setLoading(false)
      }

      // Subscribe for live updates
      subscription = db.products
        .find({ selector, sort: [{ name: 'asc' }, { id: 'asc' }] })
        .$
        .subscribe({
          next: (docs) => {
            if (!active) return
            setProducts(docs.map((doc) => doc.toJSON()))
            setLoading(false)
          },
          error: (error) => {
            console.error('useProducts subscription error:', error)
            setLoading(false)
          }
        })
    })

    return () => {
      active = false
      subscription?.unsubscribe()
      replication?.cancel()
    }
  }, [business?.id, branchId, isOwnerOrManager])

  return { products, loading }
}

