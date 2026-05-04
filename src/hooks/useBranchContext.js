import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useUser, useCurrentBusiness } from "./useRole"
import { useInstantAuth } from "./useInstantAuth"

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
  // Owners can see all branches, managers can see their assigned branches (if multiple)
  const canViewAll = isOwner || (isManager && availableBranches.length > 1)
  
  // Fetch available branches for current user
  useEffect(() => {
    if (!user?.id || !businessId || !initialized) {
      setLoading(false)
      return
    }
    
    const fetchBranches = async () => {
      try {
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
        
        // Set default branch for non-owners
        if (!isOwner && branches?.length > 0) {
          const defaultBranch = branches.find(b => b.id === user.default_branch_id) || branches[0]
          setActiveBranch(defaultBranch)
          
          // If manager has multiple branches, allow them to switch between their assigned branches
          if (user.role === 'manager' && branches.length > 1) {
            setViewMode('branch') // Still in branch mode, but can switch between their branches
          } else {
            setViewMode('branch') // Single branch or cashier
          }
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
  
  // Switch to all branches view (owners only or managers with multiple branches)
  const showAllBranches = () => {
    if (canViewAll) {
      setActiveBranch(null)
      // For owners, show all branches. For managers, show "all" of their assigned branches
      setViewMode('all')
    }
  }

  const refreshBranches = () => {
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
