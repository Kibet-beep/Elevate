import { useState, useEffect, useCallback } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate, useParams } from "react-router-dom"
import { useCurrentBusiness, useIsOwner } from "../../hooks/useRole"
import { useBranchContext } from "../../context/BranchContext"
import { getDb, startBranchAssignmentsReplication } from "../../lib/db"
import { AppShell, UiButton, UiCard } from "../../components/ui"

export default function EmployeeDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { businessId } = useCurrentBusiness()
  const { availableBranches, effectiveBranchId, canViewAll } = useBranchContext()
  const isOwner = useIsOwner()
  
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  
  // Form state
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("cashier")
  const [selectedBranches, setSelectedBranches] = useState([])
  const [isActive, setIsActive] = useState(true)

  const fetchEmployee = useCallback(async () => {
    try {
      const db = await getDb()
      try {
        startBranchAssignmentsReplication(db.branch_assignments, businessId)
      } catch (error) {
        console.error("Failed to start branch assignments replication:", error)
      }

      const { data: emp } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .eq("business_id", businessId)
        .single()

      if (emp) {
        setEmployee(emp)
        setFullName(emp.full_name || "")
        setEmail(emp.email || "")
        setRole(emp.role || "cashier")
        setIsActive(emp.is_active !== false)
        
        const assignmentDocs = await db.branch_assignments.find({
          selector: {
            user_id: id,
            is_active: true,
            _deleted: { $ne: true },
          },
        }).exec()

        const assignedBranches = assignmentDocs.map((doc) => doc.branch_id)
        if (!canViewAll && effectiveBranchId && !assignedBranches.includes(effectiveBranchId)) {
          setError("You do not have access to this employee.")
          setEmployee(null)
          return
        }

        setSelectedBranches(assignedBranches)
      }
    } catch {
      setError("Failed to load employee")
    } finally {
      setLoading(false)
    }
  }, [businessId, canViewAll, effectiveBranchId, id])

  useEffect(() => {
    if (!id || !businessId) return

    const timer = window.setTimeout(() => {
      void fetchEmployee()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [id, businessId, fetchEmployee])

  const handleSave = async () => {
    setError("")
    setSaving(true)

    try {
      // Update employee basic info
      const { error: updateError } = await supabase
        .from("users")
        .update({
          full_name: fullName,
          email,
          role,
          is_active: isActive,
        })
        .eq("id", id)
        .eq("business_id", businessId)

      if (updateError) throw updateError

      // Update branch assignments
      if (isOwner && availableBranches.length > 0) {
        const db = await getDb()
        const existingAssignments = await db.branch_assignments.find({
          selector: {
            user_id: id,
            _deleted: { $ne: true },
          },
        }).exec()

        const existingByBranch = new Map(existingAssignments.map((doc) => [doc.branch_id, doc]))
        const selectedSet = new Set(selectedBranches)

        await Promise.all(selectedBranches.map(async (branchId) => {
          const assignmentId = `${id}:${branchId}`
          const existing = existingByBranch.get(branchId)
          const payload = {
            id: assignmentId,
            user_id: id,
            branch_id: branchId,
            role,
            is_active: true,
            _modified: Date.now(),
            _deleted: false,
          }

          if (existing) {
            await existing.incrementalPatch(payload)
          } else {
            if (db.branch_assignments && typeof db.branch_assignments.upsert === 'function') {
              await db.branch_assignments.upsert(payload)
            } else {
              // Fallback: try server upsert if local collection is unavailable
              console.warn('branch_assignments collection not available locally; falling back to server upsert')
              const { error: upsertError } = await supabase
                .from('user_branch_assignments')
                .upsert({ user_id: id, branch_id: branchId, role, is_active: true })

              if (upsertError) throw upsertError
            }
          }
        }))

        await Promise.all(
          existingAssignments
            .filter((doc) => !selectedSet.has(doc.branch_id))
            .map((doc) => doc.incrementalPatch({ _deleted: true, _modified: Date.now() }))
        )
      }

      setEditing(false)
      void fetchEmployee()
    } catch (error) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleBranch = (branchId) => {
    setSelectedBranches(prev => 
      prev.includes(branchId) 
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    )
  }

  const goBack = () => {
    navigate(-1)
  }

  if (loading) {
    return (
      <AppShell title="Employee" showHeader={true}>
        <div className="flex items-center justify-center py-12">
          <p className="text-zinc-500">Loading...</p>
        </div>
      </AppShell>
    )
  }

  if (!employee) {
    return (
      <AppShell title="Employee" showHeader={true}>
        <div className="flex items-center justify-center py-12">
          <p className="text-zinc-500">Employee not found</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Employee Details"
      subtitle={employee.full_name}
      showHeader={true}
      right={(
        <div className="flex items-center gap-1.5 sm:gap-3">
          <UiButton variant="secondary" size="sm" onClick={goBack} className="text-xs px-2 sm:px-3">←</UiButton>
          <UiButton 
            variant="primary" 
            size="sm" 
            onClick={() => setEditing(!editing)} 
            className="text-xs px-2 sm:px-3"
          >
            {editing ? "Cancel" : "Edit"}
          </UiButton>
        </div>
      )}
    >
      <div className="space-y-4">
        {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}

        {editing ? (
          <UiCard className="p-4 space-y-4">
            <h3 className="text-white font-semibold text-sm">Edit Employee</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm"
                />
              </div>
              
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm"
                >
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Status</label>
                <select
                  value={isActive ? "active" : "inactive"}
                  onChange={e => setIsActive(e.target.value === "active")}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {isOwner && availableBranches.length > 0 && (
              <div>
                <label className="text-zinc-400 text-xs mb-2 block">
                  Branch Assignments {role === "manager" && "(Managers can have multiple branches)"}
                </label>
                <div className="space-y-2">
                  {availableBranches.map(branch => (
                    <label key={branch.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBranches.includes(branch.id)}
                        onChange={() => toggleBranch(branch.id)}
                        className="w-4 h-4 text-emerald-500 bg-zinc-800 border-zinc-600 rounded focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <p className="text-white text-sm">{branch.name}</p>
                        <p className="text-zinc-500 text-xs">{branch.code || 'No code'}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <UiButton variant="primary" className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </UiButton>
              <UiButton variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </UiButton>
            </div>
          </UiCard>
        ) : (
          <UiCard className="p-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-bold">{employee.full_name?.charAt(0)}</span>
              </div>
              <div>
                <h3 className="text-white font-semibold">{employee.full_name}</h3>
                <p className="text-zinc-500 text-sm">{employee.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                    employee.is_active !== false ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {employee.is_active !== false ? "Active" : "Inactive"}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 capitalize">
                    {employee.role}
                  </span>
                </div>
              </div>
            </div>

            {isOwner && availableBranches.length > 0 && (
              <div>
                <h4 className="text-zinc-300 font-medium text-sm mb-2">Branch Assignments</h4>
                <div className="space-y-2">
                  {selectedBranches.length > 0 ? (
                    selectedBranches.map(branchId => {
                      const branch = availableBranches.find(b => b.id === branchId)
                      return branch ? (
                        <div key={branchId} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2">
                          <div>
                            <p className="text-white text-sm">{branch.name}</p>
                            <p className="text-zinc-500 text-xs">{branch.code || 'No code'}</p>
                          </div>
                        </div>
                      ) : null
                    })
                  ) : (
                    <p className="text-zinc-500 text-sm">No branch assignments</p>
                  )}
                </div>
              </div>
            )}
          </UiCard>
        )}
      </div>
    </AppShell>
  )
}
