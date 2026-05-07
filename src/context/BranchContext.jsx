// src/context/BranchContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "../lib/supabase"
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
  const canViewAll = isOwner

  const [availableBranches, setAvailableBranches] = useState([])
  const [activeBranch, setActiveBranchState] = useState(null)
  const [viewMode, setViewMode] = useState('branch')
  const [loading, setLoading] = useState(true)
  const [refreshToken, setRefreshToken] = useState(0)

  const applyDefaultBranch = useCallback((branches) => {
  console.log('applyDefaultBranch called, branches:', branches.length, 'stored:', getStoredBranch())
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

  const fetchBranches = useCallback(async () => {
  console.log('fetchBranches called:', { userId: user?.id, resolvedBusinessId, initialized })

  if (!user?.id || !resolvedBusinessId || !initialized) {
    setLoading(false)
    return
  }

  setLoading(true)

  try {
    if (isOwner) {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', resolvedBusinessId)
        .eq('is_active', true)
        .order('name')

      const branches = data || []
      branchCache.set(`${user.id}-${resolvedBusinessId}-owner`, { branches, timestamp: Date.now() })
      setAvailableBranches(branches)
      applyDefaultBranch(branches)
    } else {
      // For managers/cashiers — use default_branch_id directly
      // instead of querying user_branch_assignments which is hanging
      const defaultBranchId = user?.default_branch_id
      
      if (!defaultBranchId) {
        setAvailableBranches([])
        setActiveBranchState(null)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', defaultBranchId)
        .single()

      const branches = data ? [data] : []
      setAvailableBranches(branches)
      applyDefaultBranch(branches)
    }
  } catch (error) {
    console.error('Failed to fetch branches:', error)
  } finally {
    setLoading(false)
  }
}, [user?.id, user?.role, user?.default_branch_id, resolvedBusinessId, initialized, isOwner, applyDefaultBranch])

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

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