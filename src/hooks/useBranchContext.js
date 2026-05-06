import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useUser, useCurrentBusiness } from "./useRole"
import { useInstantAuth } from "./useInstantAuth"

// Cache for branch data to avoid repeated queries
const branchCache = new Map()
const BRANCH_CACHE_TTL_MS = 5 * 60 * 1000
const branchSelectionStore = new Map()
const BRANCH_SELECTION_EVENT = "elevate:branch-selection-changed"

function buildSelectionKey(userId, businessId, role) {
  return `${userId || "anon"}:${businessId || "none"}:${role || "unknown"}`
}

function setStoredSelection(selectionKey, payload) {
  branchSelectionStore.set(selectionKey, payload)
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(BRANCH_SELECTION_EVENT, {
        detail: { selectionKey, ...payload },
      })
    )
  }
}

export function useBranchContext() {
  const { user, userRole } = useUser()
  const { businessId } = useCurrentBusiness()
  const { initialized, business } = useInstantAuth()
  const resolvedBusinessId = businessId || business?.id || null
  const resolvedRole = userRole || user?.role || null
  const selectionKey = buildSelectionKey(user?.id, resolvedBusinessId, resolvedRole)
  
  const [activeBranch, setActiveBranch] = useState(null)
  const [viewMode, setViewMode] = useState('all') // 'all' | 'branch'
  const [availableBranches, setAvailableBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshToken, setRefreshToken] = useState(0)
  
  const isOwner = resolvedRole === 'owner'
  const isManager = resolvedRole === 'manager'
  const isCashier = resolvedRole === 'cashier'
  
  // Owners can toggle to "all branches" view. Managers and cashiers cannot.
  const canViewAll = isOwner

  const applyDefaultBranch = (branches) => {
    const storedSelection = branchSelectionStore.get(selectionKey)
    if (storedSelection?.viewMode === 'all' && isOwner) {
      setActiveBranch(null)
      setViewMode('all')
      return
    }

    if (storedSelection?.branchId) {
      const storedBranch = branches.find((branch) => branch.id === storedSelection.branchId)
      if (storedBranch) {
        setActiveBranch(storedBranch)
        setViewMode('branch')
        return
      }
    }

    if (branches.length === 0) {
      setActiveBranch(null)
      setViewMode(isOwner ? 'all' : 'branch')
      return
    }
    // Prefer user's explicitly assigned default branch, fall back to first
    const defaultBranch = branches.find(b => b.id === user?.default_branch_id) || branches[0]
    setActiveBranch(defaultBranch)
    setViewMode('branch')
  }

  const fetchBranches = async () => {
  if (!user?.id || !resolvedBusinessId || !initialized) {
    setLoading(false)
    return
  }

  setLoading(true)

  try {
    const cacheKey = `${user.id}-${resolvedBusinessId}-${resolvedRole || 'unknown'}` 
    const cached = branchCache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < BRANCH_CACHE_TTL_MS) {
      setAvailableBranches(cached.branches)
      applyDefaultBranch(cached.branches)
      setLoading(false)
      return
    }
    
    let branches = []

    if (isOwner) {
      // Owners see all active branches
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', resolvedBusinessId)
        .eq('is_active', true)
        .order('name')
      branches = data || []
    } else {
      // Managers and cashiers only see branches they're assigned to
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
    
    setAvailableBranches(branches)
    branchCache.set(cacheKey, { branches, timestamp: Date.now() })
    applyDefaultBranch(branches)
    
  } catch (error) {
    console.error('Failed to fetch branches:', error)
  } finally {
    setLoading(false)
  }
}

useEffect(() => {
  fetchBranches()
}, [user?.id, userRole, user?.default_branch_id, resolvedBusinessId, initialized])

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleSelectionChanged = (event) => {
      const detail = event?.detail
      if (!detail || detail.selectionKey !== selectionKey) return

      if (detail.viewMode === "all" && isOwner) {
        setActiveBranch(null)
        setViewMode("all")
        return
      }

      if (detail.branchId) {
        const selected = availableBranches.find((branch) => branch.id === detail.branchId)
        if (selected) {
          setActiveBranch(selected)
          setViewMode("branch")
        }
      }
    }

    window.addEventListener(BRANCH_SELECTION_EVENT, handleSelectionChanged)
    return () => window.removeEventListener(BRANCH_SELECTION_EVENT, handleSelectionChanged)
  }, [selectionKey, availableBranches, isOwner])

  // Handle manual refresh without infinite loop
  useEffect(() => {
    if (refreshToken > 0 && user?.id && resolvedBusinessId && initialized) {
      fetchBranches()
    }
  }, [refreshToken])
  
  const selectBranch = (branch) => {
    setActiveBranch(branch)
    setViewMode('branch')
    setStoredSelection(selectionKey, { viewMode: 'branch', branchId: branch?.id || null })
  }
  
  const showAllBranches = () => {
    if (isOwner) {
      setActiveBranch(null)
      setViewMode('all')
      setStoredSelection(selectionKey, { viewMode: 'all', branchId: null })
    }
  }

  const refreshBranches = () => {
    if (user?.id && resolvedBusinessId) {
      // Clear cache for this user and role
      const cacheKey = `${user.id}-${resolvedBusinessId}-${resolvedRole || 'unknown'}`
      branchCache.delete(cacheKey)
    }
    setRefreshToken(t => t + 1)
  }
  
  const getCurrentBranchId = () => viewMode === 'branch' ? activeBranch?.id : null
  const effectiveBranchId = canViewAll ? getCurrentBranchId() : (activeBranch?.id || null)
  
  const hasBranchAccess = (branchId) => {
    if (isOwner) return true
    return availableBranches.some(b => b.id === branchId)
  }
  
  return {
    activeBranch,
    viewMode,
    availableBranches,
    loading,
    canViewAll,
    isOwner,
    isManager,
    isCashier,
    currentBranchId: getCurrentBranchId(),
    hasBranches: availableBranches.length > 0,
    setActiveBranch: selectBranch,
    setViewMode,
    showAllBranches,
    refreshBranches,
    hasBranchAccess,
    getCurrentBranchId,
    effectiveBranchId,
    scopeMode: canViewAll && !effectiveBranchId ? 'all' : 'branch',
  }
}
