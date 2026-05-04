// src/pages/settings/Employees.jsx
import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import { useUser, useCurrentBusiness } from "../../hooks/useRole"
import { useBranchContext } from "../../hooks/useBranchContext"
import { AppShell, UiButton, UiCard } from "../../components/ui"

export default function Employees() {
  const navigate = useNavigate()
  const { user: authUser } = useUser()
  const { businessId } = useCurrentBusiness()
  const { availableBranches, activeBranch, viewMode, canViewAll } = useBranchContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate("/settings", { replace: true })
  }

  const handleBranchSelect = (branch) => {
    // Navigate to branch-specific employee management
    navigate(`/settings/branch-employees`, { state: { branchId: branch.id, branchName: branch.name } })
  }

  const handleManageAllEmployees = () => {
    // Navigate to employee management for all branches
    navigate(`/settings/branch-employees`)
  }

  return (
    <AppShell
      title="Employees"
      subtitle="Manage your team and access roles by branch"
      showHeader={false}
      right={(
        <div className="flex items-center gap-1.5 sm:gap-3 max-w-[calc(100vw-2rem)] sm:max-w-none">
          <UiButton variant="secondary" size="sm" onClick={goBack} className="flex-shrink-0 text-xs px-2 sm:px-3" aria-label="Back">←</UiButton>
        </div>
      )}
    >
      <div className="space-y-4">
        {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}

        {availableBranches.length === 0 ? (
          <UiCard className="p-6 text-center">
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-zinc-400 text-lg">📍</span>
            </div>
            <h3 className="text-white font-semibold text-sm mb-2">No branches yet</h3>
            <p className="text-zinc-500 text-xs mb-4">Create your first branch to start managing employees</p>
            <UiButton variant="primary" onClick={() => navigate("/settings/branches")}>
              Create Branch
            </UiButton>
          </UiCard>
        ) : (
          <>
            <UiCard className="p-4">
              <h3 className="text-white font-semibold text-sm mb-3">Manage Employees by Branch</h3>
              <div className="space-y-2">
                {canViewAll && (
                  <UiButton
                    variant="secondary"
                    className="w-full justify-start"
                    onClick={handleManageAllEmployees}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center">
                        <span className="text-zinc-300 text-sm">🏢</span>
                      </div>
                      <div className="text-left">
                        <p className="text-white text-sm font-medium">All Branches</p>
                        <p className="text-zinc-500 text-xs">View and manage employees across all locations</p>
                      </div>
                    </div>
                  </UiButton>
                )}
                
                {availableBranches.map((branch) => (
                  <UiButton
                    key={branch.id}
                    variant="secondary"
                    className="w-full justify-start"
                    onClick={() => handleBranchSelect(branch)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center">
                        <span className="text-emerald-400 text-sm font-bold">{branch.name?.charAt(0)}</span>
                      </div>
                      <div className="text-left">
                        <p className="text-white text-sm font-medium">{branch.name}</p>
                        <p className="text-zinc-500 text-xs">{branch.code || 'No code'} • Manage branch-specific employees</p>
                      </div>
                    </div>
                  </UiButton>
                ))}
              </div>
            </UiCard>

            <UiCard className="p-4 bg-zinc-800/50 border-zinc-700">
              <h4 className="text-zinc-300 font-medium text-xs mb-2">💡 Employee Management Tips</h4>
              <ul className="text-zinc-500 text-xs space-y-1">
                <li>• Employees are assigned to specific branches</li>
                <li>• Managers can only see employees at their branch</li>
                <li>• Owners can view and manage all branches</li>
                <li>• Each branch maintains its own employee roster</li>
              </ul>
            </UiCard>
          </>
        )}
      </div>
    </AppShell>
  )
}