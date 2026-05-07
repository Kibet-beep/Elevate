// src/context/BranchContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { useUser, useCurrentBusiness } from "../hooks/useRole"
import { useInstantAuth } from "../hooks/useInstantAuth"

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
    if (branches.length === 0) {
      setActiveBranchState(null)
      setViewMode(isOwner ? 'all' : 'branch')
      return
    }
    const defaultBranch = 
      branches.find(b => b.id === user?.default_branch_id) || branches[0]
    setActiveBranchState(defaultBranch)
    setViewMode('branch')
  }, [isOwner, user?.default_branch_id])

  const fetchBranches = useCallback(async () => {
    if (!user?.id || !resolvedBusinessId || !initialized) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const cacheKey = `${user.id}-${resolvedBusinessId}-${user.role}-${refreshToken}`
      const cached = branchCache.get(cacheKey)

      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setAvailableBranches(cached.branches)
        applyDefaultBranch(cached.branches)
        setLoading(false)
        return
      }

      let branches = []

      if (isOwner) {
        const { data } = await supabase
          .from('branches')
          .select('*')
          .eq('business_id', resolvedBusinessId)
          .eq('is_active', true)
          .order('name')
        branches = data || []
      } else {
        const { data: assignments } = await supabase
          .from('user_branch_assignments')
          .select('branch_id, branches(*)')
          .eq('user_id', user.id)
          .eq('is_active', true)

        branches = (assignments || [])
          .map(a => a.branches)
          .filter(Boolean)
          .filter(b => b.is_active)
      }

      branchCache.set(cacheKey, { branches, timestamp: Date.now() })
      setAvailableBranches(branches)
      applyDefaultBranch(branches)

    } catch (error) {
      console.error('Failed to fetch branches:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id, user?.role, user?.default_branch_id, resolvedBusinessId, initialized, refreshToken, isOwner, applyDefaultBranch])

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  const effectiveBranchId = (() => {
    if (isCashier) {
      return activeBranch?.id ?? user?.default_branch_id ?? null
    }
    if (isManager) {
      return activeBranch?.id ?? null
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
  }, [isCashier])

  const showAllBranches = useCallback(() => {
    if (!isOwner) return
    setActiveBranchState(null)
    setViewMode('all')
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