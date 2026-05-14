import { useEffect, useState } from 'react'
import { getDb } from '../lib/db'
import { useInstantAuth } from './useInstantAuth'

export function useBranches(businessId = null) {
  const { business } = useInstantAuth()
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const resolvedBusinessId = businessId || business?.id

  useEffect(() => {
    if (!resolvedBusinessId) return

    let active = true
    let subscription

    getDb().then(async (db) => {
      if (!active) return

      const selector = {
        business_id: resolvedBusinessId,
        status: { $ne: 'archived' },
        _deleted: { $ne: true },
      }

      try {
        const existingDocs = await db.branches.find({ selector, sort: [{ name: 'asc' }, { id: 'asc' }] }).exec()
        if (existingDocs.length > 0) {
          setBranches(existingDocs.map((doc) => doc.toJSON()))
          setLoading(false)
        }
      } catch (error) {
        console.error('useBranches initial fetch error:', error)
        setBranches([])
        setLoading(false)
      }

      subscription = db.branches
        .find({ selector, sort: [{ name: 'asc' }, { id: 'asc' }] })
        .$
        .subscribe({
          next: (docs) => {
            if (!active) return
            setBranches(docs.map((doc) => doc.toJSON()))
            setLoading(false)
          },
          error: (error) => {
            console.error('useBranches subscription error:', error)
            setLoading(false)
          },
        })
    })

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [resolvedBusinessId])

  return { branches, loading }
}