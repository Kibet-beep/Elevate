import { useState, useEffect, useCallback } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useUser, useCurrentBusiness, useIsOwner, useIsManager } from "../../hooks/useRole"
import { useBranchContext } from "../../context/BranchContext"
import { getDb, startBranchAssignmentsReplication } from "../../lib/db"
import { AppShell, UiButton, UiCard } from "../../components/ui"
import { BranchSelector } from "../../components/BranchSelector"
import { useBranches } from "../../hooks/useBranches"

export default function BranchEmployees() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user: authUser } = useUser()
  const { businessId } = useCurrentBusiness()
  const { activeBranch, viewMode, canViewAll, availableBranches, readyToFetch, setActiveBranch, setViewMode, effectiveBranchId } = useBranchContext()
  const isOwner = useIsOwner()
  const isManager = useIsManager()
  
  const [employees, setEmployees] = useState([])
  const [adding, setAdding] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("cashier")
  const [targetBranchId, setTargetBranchId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const branchIdFromNavigation = location.state?.branchId || null
  const branchNameFromNavigation = location.state?.branchName || null
  const currentBranchName = branchNameFromNavigation || activeBranch?.name || "All branches"
  const resolvedTargetBranchId = viewMode === 'branch'
    ? activeBranch?.id
    : (targetBranchId || (canViewAll && availableBranches.length === 1 ? availableBranches[0].id : ""))

  useEffect(() => {
    if (!readyToFetch) return

    if (branchIdFromNavigation) {
      const branch = availableBranches.find((item) => item.id === branchIdFromNavigation)
      if (branch) {
        setActiveBranch(branch)
        setViewMode("branch")
      }
    }

    if (availableBranches.length === 0) {
      navigate("/settings")
    }
  }, [availableBranches, branchIdFromNavigation, readyToFetch, navigate, setActiveBranch, setViewMode])

  const fetchEmployees = useCallback(async () => {
    if (!canViewAll && !effectiveBranchId) {
      setEmployees([])
      return
    }

    const db = await getDb()

    let replication
    try {
      replication = startBranchAssignmentsReplication(db.branch_assignments, businessId)
    } catch (error) {
      console.error("Failed to start branch assignments replication:", error)
    }

    const scopeBranchId = viewMode === 'branch' ? activeBranch?.id : effectiveBranchId
    const selector = {
    }

    try {
      const db = await getDb()
      const selector = {
        business_id: businessId,
        _deleted: { $ne: true },
        ...(userIds.length > 0 ? { id: { $in: userIds } } : {})
      }
      
      const existingDocs = await db.users.find({ selector }).exec()
      setEmployees(existingDocs.map((doc) => doc.toJSON()))
    } catch (error) {
      console.error('Failed to fetch employees:', error)
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }, [activeBranch?.id, businessId, canViewAll, effectiveBranchId, viewMode])

  useEffect(() => {
    if (!businessId || !readyToFetch) return

    const timer = window.setTimeout(() => {
      void fetchEmployees()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [businessId, readyToFetch, fetchEmployees])

  const handleAddEmployee = async () => {
    setError("")

    if (!fullName || !email || !password) {
      setError("Name, email and password are required")
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Invalid email format")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (!businessId) {
      setError("Business ID not loaded. Please refresh the page.")
      return
    }

    setLoading(true)

    try {
      // Use RxDB for user creation
      const db = await getDb()
      const userPayload = {
        email,
        full_name: fullName,
        role,
        business_id: businessId,
        is_active: true,
        _modified: Date.now(),
      }

      // Create user in RxDB
      await db.users.upsert(userPayload)

      setLoading(false)
      return
    } catch (error) {
      setError(error.message || "Failed to add employee")
    } finally {
      setLoading(false)
    }

    if (error) {
      setError(error)
    } else {
      setSuccessMessage(`${fullName} has been added to the team`)
      setSuccess(true)
      setFullName("")
      setEmail("")
      setPassword("")
      setRole("cashier")
      setAdding(false)
      void fetchEmployees()
      setTimeout(() => setSuccess(false), 3000)
    }

    setLoading(false)
  }

  const toggleActive = async (emp) => {
    await supabase.from("users").update({ is_active: !emp.is_active }).eq("id", emp.id)
    void fetchEmployees()
  }

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate("/settings", { replace: true })
  }

  const getBranchContext = () => {
    if (branchNameFromNavigation) {
      return ` • ${branchNameFromNavigation}`
    }
    if (viewMode === 'branch' && activeBranch) {
      return ` • ${activeBranch.name}`
    }
    if (canViewAll) {
      if (isOwner) return " • All Branches"
      if (isManager) return " • All My Branches"
      return " • All Branches"
    }
    return ""
  }

  return (
    <AppShell
      title="Employees"
      subtitle={`Manage your team and access roles${getBranchContext()}`}
      showHeader={true}
      right={(
        <div className="flex w-full flex-wrap items-stretch gap-1.5 sm:w-auto sm:items-center sm:gap-3 max-w-[calc(100vw-2rem)] sm:max-w-none">
          <UiButton variant="secondary" size="sm" onClick={goBack} className="flex-1 text-xs px-2 sm:flex-none sm:px-3" aria-label="Back">←</UiButton>
          {canViewAll ? <BranchSelector /> : null}
          <UiButton variant="primary" size="sm" onClick={() => setAdding(!adding)} className="flex-1 text-xs px-2 sm:flex-none sm:px-3">{adding ? "Cancel" : "+ Add"}</UiButton>
        </div>
      )}
    >
      <div className="space-y-4">
        {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
        {success && <p className="text-emerald-400 text-sm bg-emerald-400/10 px-3 py-2 rounded-lg">{successMessage}</p>}

        {/* Scope Badge */}
        <UiCard className="p-3 bg-zinc-800/50 border-zinc-700/50">
          <p className="text-zinc-500 text-xs uppercase tracking-wider">Current scope</p>
          <p className="text-white text-sm font-semibold mt-1">{currentBranchName}</p>
        </UiCard>

        <UiCard className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider">Branch scope</p>
              <h2 className="text-white text-lg font-semibold mt-1">{currentBranchName}</h2>
              <p className="text-zinc-500 text-sm mt-1">Add staff, assign roles, and keep access aligned with the selected branch.</p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              {employees.length} employee{employees.length === 1 ? "" : "s"}
            </span>
          </div>
        </UiCard>

        {adding && (
          <UiCard className="p-4 space-y-3">
            <h2 className="text-white font-semibold text-sm">New employee</h2>
            {[
              { label: "Full name", value: fullName, setter: setFullName, placeholder: "Jane Wanjiku" },
              { label: "Email", value: email, setter: setEmail, placeholder: "jane@business.com", type: "email" },
            ].map((f, i) => (
              <div key={i}>
                <label className="text-zinc-400 text-xs mb-1 block">{f.label} {f.label === "Email" && <span className="text-red-400">*</span>}</label>
                <input type={f.type || "text"} value={f.value} onChange={(event) => f.setter(event.target.value)}
                  placeholder={f.placeholder}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600" />
                {f.label === "Email" && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && 
                  <p className="text-red-400 text-xs mt-1">Invalid email format</p>
                }
              </div>
            ))}
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Temporary password <span className="text-red-400">*</span></label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
              />
              {password && password.length < 6 && <p className="text-red-400 text-xs mt-1">Password must be at least 6 characters</p>}
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Role</label>
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors">
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            {viewMode === 'branch' && activeBranch && (
              <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3">
                <p className="text-zinc-400 text-xs mb-1">Branch assignment</p>
                <p className="text-white text-sm font-medium">{activeBranch.name}</p>
              </div>
            )}
            {canViewAll && viewMode !== 'branch' && (
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Assign to branch</label>
                <select
                  value={targetBranchId}
                  onChange={(e) => setTargetBranchId(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="">Select a branch</option>
                  {availableBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} {branch.code ? `(${branch.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <UiButton 
              variant="primary" 
              className="w-full" 
              onClick={handleAddEmployee} 
              disabled={loading || !fullName || !email || !password || password.length < 6 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !resolvedTargetBranchId}
            >
              {loading ? "Adding..." : "Add employee"}
            </UiButton>
          </UiCard>
        )}

        <div className="space-y-2">
          {employees.map((emp, i) => (
            <div
              key={i} 
              className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:border-emerald-500/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/settings/employees/${emp.id}`)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{emp.full_name?.charAt(0)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium">{emp.full_name}
                    {emp.id === authUser.id && <span className="text-zinc-500 text-xs ml-1">(you)</span>}
                  </p>
                  <p className="text-zinc-500 text-xs capitalize break-words">{emp.role} · {emp.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${
                  emp.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                }`}>
                  {emp.is_active ? "Active" : "Inactive"}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-zinc-800 text-zinc-400 capitalize">
                  {emp.role}
                </span>
                {emp.id !== authUser.id && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleActive(emp)
                    }}
                    className={`text-xs px-3 py-1.5 rounded-xl transition-colors flex-shrink-0 ${
                      emp.is_active ? "bg-zinc-800 text-zinc-400 hover:text-red-400" : "bg-emerald-500/10 text-emerald-400"
                    }`}>
                    {emp.is_active ? "Deactivate" : "Activate"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
