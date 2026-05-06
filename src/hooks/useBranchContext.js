import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useUser, useCurrentBusiness } from "./useRole"
import { useInstantAuth } from "./useInstantAuth"

// Cache for branch data to avoid repeated queries
const branchCache = new Map()

export function useBranchContext() {
  const { user } = useUser()
  const { businessId } = useCurrentBusiness()
  const { initialized } = useInstantAuth()
  
  const [activeBranch, setActiveBranch] = useState(null)
  const [viewMode, setViewMode] = useState('all') // 'all' | 'branch'
  const [availableBranches, setAvailableBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshToken, setRefreshToken] = useState(0)
  
  const isOwner = user?.role === 'owner'
  const isManager = user?.role === 'manager'
  // Only owners can see all branches
  const canViewAll = isOwner
  
  // Fetch available branches for current user
  useEffect(() => {
    if (!user?.id || !businessId || !initialized) {
      setLoading(false)
      return
    }
    
    const fetchBranches = async () => {
      try {
        const cacheKey = `${user.id}-${businessId}-${isOwner ? 'owner' : 'user'}`
        const cached = branchCache.get(cacheKey)
        
        // Return cached data until it is explicitly refreshed
        if (cached) {
          setAvailableBranches(cached.branches)
          if (cached.branches?.length > 0) {
            const defaultBranch = cached.branches.find(b => b.id === user.default_branch_id) || cached.branches[0]
            setActiveBranch(defaultBranch)
            setViewMode('branch')
          } else {
            setActiveBranch(null)
            setViewMode('all')
          }
          setLoading(false)
          return
        }
        
        let query = supabase
          .from('branches')
          .select('*')
          .eq('business_id', businessId)
          .eq('is_active', true)
          .order('name')
        
        // Non-owners can only see their assigned branches
        if (!isOwner) {
          // For non-owners, get branches they're assigned to
          const { data: assignments } = await supabase
            .from('user_branch_assignments')
            .select('branch_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
          
          const branchIds = assignments?.map(a => a.branch_id) || []
          if (branchIds.length === 0) {
            setAvailableBranches([])
            setLoading(false)
            return
          }
          
          query = query.in('id', branchIds)
        }
        
        const { data: branches } = await query
        
        setAvailableBranches(branches || [])
        
        // Cache the results
        branchCache.set(cacheKey, {
          branches: branches || [],
          timestamp: Date.now()
        })
        
        // Set default branch for all users (owners, managers, cashiers)
        if (branches?.length > 0) {
          const defaultBranch = branches.find(b => b.id === user.default_branch_id) || branches[0]
          setActiveBranch(defaultBranch)
          // Cashiers and managers always stay in branch view - they cannot see all branches
          // Only owners can switch to 'all' view
          setViewMode(isOwner ? 'branch' : 'branch')
        } else {
          setActiveBranch(null)
          // Only owners can be in 'all' view mode
          setViewMode(isOwner ? 'all' : 'branch')
        }
        
      } catch (error) {
        console.error('Failed to fetch branches:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchBranches()
  }, [user?.id, businessId, initialized, isOwner, user?.default_branch_id, refreshToken])
  
  // Handle branch selection
  const selectBranch = (branch) => {
    setActiveBranch(branch)
    setViewMode('branch')
  }
  
  // Switch to all branches view (owners only)
  const showAllBranches = () => {
    if (isOwner) {
      setActiveBranch(null)
      setViewMode('all')
    }
  }

  const refreshBranches = () => {
    // Clear cache for current user when refreshing
    if (user?.id && businessId) {
      const cacheKey = `${user.id}-${businessId}-${isOwner ? 'owner' : 'user'}`
      branchCache.delete(cacheKey)
    }
    setRefreshToken((current) => current + 1)
  }
  
  // Get current branch ID for queries
  const getCurrentBranchId = () => {
    return viewMode === 'branch' ? activeBranch?.id : null
  }
  
  // Check if user has access to a specific branch
  const hasBranchAccess = (branchId) => {
    if (isOwner) return true
    return availableBranches.some(b => b.id === branchId)
  }
  
  return {
    // State
    activeBranch,
    viewMode,
    availableBranches,
    loading,
    
    // Computed
    canViewAll,
    isOwner,
    currentBranchId: getCurrentBranchId(),
    hasBranches: availableBranches.length > 0,
    
    // Actions
    setActiveBranch: selectBranch,
    setViewMode,
    showAllBranches,
    refreshBranches,
    hasBranchAccess,
    
    // Helpers
    getCurrentBranchId,
  }
}
