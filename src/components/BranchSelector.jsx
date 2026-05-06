import { ChevronDown } from "lucide-react"
import { memo, useMemo } from "react"
import { useBranchContext } from "../hooks/useBranchContext"

function BranchSelectorComponent({ className = "", onChange = null, value = null, viewMode = null }) {
  const { 
    activeBranch, 
    viewMode: globalViewMode, 
    setViewMode, 
    availableBranches, 
    canViewAll, 
    loading,
    showAllBranches,
    setActiveBranch,
    isOwner,
    isManager
  } = useBranchContext()

  // Use local or global values
  const currentViewMode = viewMode !== null ? viewMode : globalViewMode
  const currentValue = value !== null ? value : (currentViewMode === 'all' ? 'all' : activeBranch?.id || '')
  const hasLocalControl = onChange !== null

  // Memoize expensive calculations
  const allBranchesLabel = useMemo(() => {
    if (isOwner) return "All Branches"
    if (isManager) return "All My Branches"
    return "All Branches"
  }, [isOwner, isManager])

  const branchOptions = useMemo(() => {
    if (loading) {
      return [<option key="loading" value="">Loading branches...</option>]
    }
    const options = []

    if (canViewAll) {
      options.push(<option key="all" value="all">{allBranchesLabel}</option>)
    }
    
    availableBranches.forEach(branch => {
      options.push(
        <option key={branch.id} value={branch.id}>
          {branch.name} {branch.code && `(${branch.code})`}
        </option>
      )
    })
    
    return options
  }, [loading, canViewAll, allBranchesLabel, availableBranches])

  const handleChange = (e) => {
    if (hasLocalControl) {
      // Page has local control - call the provided onChange
      onChange(e.target.value)
    } else {
      // Use global context
      if (e.target.value === 'all') {
        showAllBranches()
      } else {
        const branch = availableBranches.find(b => b.id === e.target.value)
        if (branch) setActiveBranch(branch)
      }
    }
  }

  return (
    <div className={`relative ${className}`}>
      <select
        value={currentValue}
        onChange={handleChange}
        disabled={loading || (!canViewAll && !hasLocalControl)}
        className={`appearance-none bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:border-emerald-500 transition-colors ${
          loading || (!canViewAll && !hasLocalControl) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-zinc-700'
        }`}
      >
        {branchOptions}
      </select>
      
      {/* Custom dropdown arrow */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <ChevronDown className="h-4 w-4 text-zinc-400" />
      </div>
    </div>
  )
}

export const BranchSelector = memo(BranchSelectorComponent)
