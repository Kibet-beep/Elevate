import { useEffect, useState } from 'react'
import { getDb, startBranchesReplication } from '../lib/db'
import { useInstantAuth } from './useInstantAuth'

export function useBranches(businessId = null) {
  const { business } = useInstantAuth()
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!business?.id) return

    let active = true
    let subscription
    let replication

    getDb().then(async (db) => {
      if (!active) return

      try {
        replication = startBranchesReplication(db.branches, business.id)
      } catch (error) {
        console.error('Failed to start branches replication:', error)
      }

      const selector = {
        business_id: business.id,
        status: { $ne: 'archived' },
        _deleted: { $ne: true },
      }

      try {
        const existingDocs = await db.branches.find({ selector, sort: [{ name: 'asc' }, { id: 'asc' }] }).exec()
        if (!active) return
        setBranches(existingDocs.map((doc) => doc.toJSON()))
        setLoading(false)
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
      replication?.cancel()
    }
  }, [business?.id, businessId])

  return { branches, loading }
}