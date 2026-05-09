// src/context/BranchContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { getDb, startBranchesReplication } from "../lib/db"
import { useUser, useCurrentBusiness } from "../hooks/useRole"
import { useInstantAuth } from "../hooks/useInstantAuth"

const BRANCH_STORAGE_KEY = 'elevate:active-branch'

function getStoredBranch() {
  try {
    const raw = localStorage.getItem(BRANCH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function storeBranch(branch) {
  try {
    if (branch) localStorage.setItem(BRANCH_STORAGE_KEY, JSON.stringify(branch))
    else localStorage.removeItem(BRANCH_STORAGE_KEY)
  } catch {}
}

const BranchContext = createContext(null)

const branchCache = new Map()
const CACHE_TTL = 5 * 60 * 1000

export function BranchProvider({ children }) {
  const { user } = useUser()
  const { businessId } = useCurrentBusiness()
  const { initialized, business } = useInstantAuth()
  const resolvedBusinessId = businessId || business?.id || null

  const isOwner = user?.role === 'owner'
  const isManager = user?.role === 'manager'
  const isCashier = user?.role === 'cashier'
  const canViewAll = isOwner || isManager

  const [availableBranches, setAvailableBranches] = useState([])
  const [activeBranch, setActiveBranchState] = useState(null)
  const [viewMode, setViewMode] = useState('branch')
  const [loading, setLoading] = useState(true)
  const [refreshToken, setRefreshToken] = useState(0)

  const applyDefaultBranch = useCallback((branches) => {
    if (branches.length === 0) {
      setActiveBranchState(null)
      setViewMode(isOwner ? 'all' : 'branch')
      // Clear stored branch if no branches available
      try {
        localStorage.removeItem(BRANCH_STORAGE_KEY)
      } catch {}
      return
    }

    // Try to restore previously selected branch
    const stored = getStoredBranch()
    if (stored) {
      const match = branches.find(b => b.id === stored.id)
      if (match) {
        setActiveBranchState(match)
        setViewMode('branch')
        return
      }
      // If stored branch still exists, do not reset it
      if (branches.some(b => b.id === stored.id)) return;
      // If stored branch no longer exists, clear it and use first available branch
      try {
        localStorage.removeItem(BRANCH_STORAGE_KEY)
      } catch {}
    }
    const defaultBranch =
      branches.find(b => b.id === user?.default_branch_id) || branches[0]
    setActiveBranchState(defaultBranch)
    setViewMode('branch')
  }, [isOwner, user?.default_branch_id])

  useEffect(() => {
    let active = true
    let subscription = null
    let replication = null

    async function init() {
      if (!user?.id || !resolvedBusinessId || !initialized) {
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        const db = await getDb()
        try {
          replication = startBranchesReplication(db.branches, resolvedBusinessId)
        } catch (err) {
          console.error('Failed to start branches replication:', err)
        }

        const selector = {
          business_id: resolvedBusinessId,
          status: { $ne: 'archived' },
          _deleted: { $ne: true },
          ...(isOwner ? {} : { is_active: true }),
        }

        try {
          const existing = await db.branches.find({ selector, sort: [{ name: 'asc' }, { id: 'asc' }] }).exec()
          if (!active) return
          const branches = (existing || []).map(d => d.toJSON())
          setAvailableBranches(branches)
          applyDefaultBranch(branches)
          setLoading(false)
        } catch (err) {
          console.error('Initial branches fetch from RxDB failed:', err)
        }

        // Subscribe for live updates
        subscription = db.branches
          .find({ selector, sort: [{ name: 'asc' }, { id: 'asc' }] })
          .$.subscribe({
            next: (docs) => {
              if (!active) return
              const branches = (docs || []).map(d => d.toJSON())
              setAvailableBranches(branches)
              applyDefaultBranch(branches)
              setLoading(false)
            },
            error: (err) => {
              console.error('Branches subscription error:', err)
              setLoading(false)
            }
          })
      } catch (err) {
        console.error('Failed to load branches from RxDB, falling back to Supabase:', err)
        // Fallback to previous Supabase logic
        try {
          if (isOwner) {
            const { data } = await supabase
              .from('branches')
              .select('*')
              .eq('business_id', resolvedBusinessId)
              .eq('is_active', true)
              .order('name')
            const branches = data || []
            setAvailableBranches(branches)
            applyDefaultBranch(branches)
          } else {
            const defaultBranchId = user?.default_branch_id
            if (!defaultBranchId) {
              setAvailableBranches([])
              setActiveBranchState(null)
              setLoading(false)
              return
            }
            const { data } = await supabase
              .from('branches')
              .select('*')
              .eq('id', defaultBranchId)
              .single()
            const branches = data ? [data] : []
            setAvailableBranches(branches)
            applyDefaultBranch(branches)
          }
        } catch (supErr) {
          console.error('Supabase fallback failed:', supErr)
        }
      }
    }

    init()

    return () => {
      active = false
      try { subscription?.unsubscribe() } catch {}
      try { replication?.cancel() } catch {}
    }
  }, [user?.id, user?.role, user?.default_branch_id, resolvedBusinessId, initialized, isOwner, applyDefaultBranch])

  const effectiveBranchId = (() => {
    if (isCashier) {
      return activeBranch?.id ?? user?.default_branch_id ?? null
    }
    if (isManager) {
      return activeBranch?.id ?? user?.default_branch_id ?? null
    }
    return viewMode === 'all' ? null : activeBranch?.id ?? null
  })()

  const readyToFetch = !loading && (
    isOwner ||
    !!effectiveBranchId
  )

  const selectBranch = useCallback((branch) => {
    if (isCashier) return
    setActiveBranchState(branch)
    setViewMode('branch')
    storeBranch(branch)
  }, [isCashier])

  const showAllBranches = useCallback(() => {
    if (!isOwner) return
    setActiveBranchState(null)
    setViewMode('all')
    storeBranch(null)
  }, [isOwner])

  const refreshBranches = useCallback(() => {
    for (const key of branchCache.keys()) {
      if (key.startsWith(`${user?.id}-${resolvedBusinessId}`)) {
        branchCache.delete(key)
      }
    }
    setRefreshToken(t => t + 1)
  }, [user?.id, resolvedBusinessId])

  const hasBranchAccess = useCallback((branchId) => {
    if (isOwner) return true
    return availableBranches.some(b => b.id === branchId)
  }, [isOwner, availableBranches])

  return (
    <BranchContext.Provider value={{
      activeBranch,
      viewMode,
      availableBranches,
      loading,
      canViewAll,
      isOwner,
      isManager,
      isCashier,
      effectiveBranchId,
      readyToFetch,
      hasBranches: availableBranches.length > 0,
      hasBranchAccess,
      scopeMode: !effectiveBranchId && isOwner ? 'all' : 'branch',
      setActiveBranch: selectBranch,
      showAllBranches,
      refreshBranches,
      setViewMode,
    }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranchContext() {
  const ctx = useContext(BranchContext)
  if (!ctx) throw new Error("useBranchContext must be used inside BranchProvider")
  return ctx
}