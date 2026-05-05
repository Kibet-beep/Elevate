import { ChevronDown } from "lucide-react"
import { useBranchContext } from "../hooks/useBranchContext"

export function BranchSelector({ className = "", onChange = null, value = null, viewMode = null }) {
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

  if (loading || !canViewAll) return null

  const getAllBranchesLabel = () => {
    if (isOwner) return "All Branches"
    if (isManager) return "All My Branches"
    return "All Branches"
  }

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
        className="appearance-none bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer hover:bg-zinc-700"
      >
        <option value="all">{getAllBranchesLabel()}</option>
        {availableBranches.map(branch => (
          <option key={branch.id} value={branch.id}>
            {branch.name} {branch.code && `(${branch.code})`}
          </option>
        ))}
      </select>
      
      {/* Custom dropdown arrow */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <ChevronDown className="h-4 w-4 text-zinc-400" />
      </div>
    </div>
  )
}
