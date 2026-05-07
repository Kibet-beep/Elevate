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

      replication = startProductsReplication(db.products, business.id)

      // Initial data fetch - ensure we have data even if replication is slow
      const selector = {
        business_id: business.id,
        _deleted: { $ne: true },
        is_active: { $ne: false },
        ...(branchId ? { branch_id: branchId } : {}),
        // For non-owners, ensure they only see active products (default behavior)
        ...(isOwnerOrManager ? {} : {}),
      }

      // Try to get existing data first
      const existingDocs = await db.products.find({ selector }).exec()
      if (existingDocs.length > 0) {
        setProducts(existingDocs.map((doc) => doc.toJSON()))
        setLoading(false)
      }

      // Subscribe for live updates
      subscription = db.products
        .find({ selector, sort: [{ name: 'asc' }, { id: 'asc' }] })
        .$
        .subscribe((docs) => {
          if (!active) return
          setProducts(docs.map((doc) => doc.toJSON()))
          setLoading(false)
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

