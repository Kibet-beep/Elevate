import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { useCurrentBusiness, useIsOwner } from "../../hooks/useRole"
import { useBranchContext } from "../../hooks/useBranchContext"
import { AppShell, UiButton, UiCard } from "../../components/ui"

export default function BranchDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { businessId } = useCurrentBusiness()
  const { availableBranches, refreshBranches } = useBranchContext()
  const isOwner = useIsOwner()

  const [branch, setBranch] = useState(null)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate("/settings/branches", { replace: true })
  }

  const loadBranch = async () => {
    try {
      const { data: branchData, error: branchError } = await supabase
        .from("branches")
        .select("*")
        .eq("id", id)
        .eq("business_id", businessId)
        .single()

      if (branchError) throw branchError

      setBranch(branchData)
      setName(branchData.name || "")
      setCode(branchData.code || "")
      setAddress(branchData.address || "")
      setPhone(branchData.phone || "")
      setEmail(branchData.email || "")

      const { data: assignments, error: employeeError } = await supabase
        .from("user_branch_assignments")
        .select("user_id, users(id, full_name, email, role, is_active)")
        .eq("branch_id", id)
        .eq("is_active", true)

      if (employeeError) throw employeeError

      setEmployees((assignments || []).map((item) => item.users).filter(Boolean))
    } catch (err) {
      setError(err.message || "Failed to load branch")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id && businessId) {
      loadBranch()
    }
  }, [id, businessId])

  const assignedCount = useMemo(() => employees.length, [employees])

  const handleSave = async () => {
    if (!branch || !name) {
      setError("Branch name is required")
      return
    }

    setSaving(true)
    setError("")

    try {
      const { error: updateError } = await supabase
        .from("branches")
        .update({
          name,
          code: code || null,
          address: address || null,
          phone: phone || null,
          email: email || null,
        })
        .eq("id", id)

      if (updateError) throw updateError

      await refreshBranches?.()
      await loadBranch()
      setEditing(false)
    } catch (err) {
      setError(err.message || "Failed to update branch")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async () => {
    if (!branch) return

    setSaving(true)
    setError("")

    try {
      const { error: updateError } = await supabase
        .from("branches")
        .update({ is_active: !branch.is_active })
        .eq("id", id)

      if (updateError) throw updateError

      await refreshBranches?.()
      await loadBranch()
    } catch (err) {
      setError(err.message || "Failed to update branch status")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete ${branch?.name}? This cannot be undone.`)) return

    setSaving(true)
    setError("")

    try {
      const { error: deleteError } = await supabase
        .from("branches")
        .delete()
        .eq("id", id)

      if (deleteError) throw deleteError

      await refreshBranches?.()
      navigate("/settings/branches", { replace: true })
    } catch (err) {
      setError(err.message || "Failed to delete branch")
    } finally {
      setSaving(false)
    }
  }

  const addEmployees = () => {
    navigate("/settings/branch-employees", {
      state: { branchId: id, branchName: branch?.name },
    })
  }

  if (loading) {
    return (
      <AppShell title="Branch Details" showHeader={true} right={<UiButton variant="secondary" size="sm" onClick={goBack} aria-label="Back">←</UiButton>}>
        <div className="flex items-center justify-center py-12">
          <p className="text-zinc-500">Loading...</p>
        </div>
      </AppShell>
    )
  }

  if (!branch) {
    return (
      <AppShell title="Branch Details" showHeader={true} right={<UiButton variant="secondary" size="sm" onClick={goBack} aria-label="Back">←</UiButton>}>
        <div className="flex items-center justify-center py-12">
          <p className="text-zinc-500">Branch not found</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Branch Details"
      subtitle={branch.name}
      showHeader={true}
      right={(
        <div className="flex items-center gap-1.5 sm:gap-3">
          <UiButton variant="secondary" size="sm" onClick={goBack} className="text-xs px-2 sm:px-3">←</UiButton>
          <UiButton variant="secondary" size="sm" onClick={addEmployees} className="text-xs px-2 sm:px-3">Employees</UiButton>
          <UiButton variant="primary" size="sm" onClick={() => setEditing((current) => !current)} className="text-xs px-2 sm:px-3">
            {editing ? "Cancel" : "Edit"}
          </UiButton>
        </div>
      )}
    >
      <div className="space-y-4">
        {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}

        <UiCard className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-white text-xl font-semibold">{branch.name}</h3>
              <p className="text-zinc-500 text-sm">{branch.code || "No code"} {branch.address ? `• ${branch.address}` : ""}</p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${branch.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
              {branch.is_active ? "Active" : "Inactive"}
            </span>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Branch name *</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Branch code</label>
                  <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Phone</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Email</label>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Address</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500" />
              </div>
              <div className="flex gap-3">
                <UiButton variant="primary" className="flex-1" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save changes"}</UiButton>
                <UiButton variant="secondary" onClick={handleToggleActive} disabled={saving}>{saving ? "Working..." : (branch.is_active ? "Deactivate" : "Activate")}</UiButton>
              </div>
            </div>
          ) : null}
        </UiCard>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UiCard className="p-4">
            <p className="text-zinc-500 text-xs">Employees</p>
            <p className="text-white text-2xl font-semibold mt-1">{assignedCount}</p>
          </UiCard>
          <UiCard className="p-4">
            <p className="text-zinc-500 text-xs">Branch code</p>
            <p className="text-white text-2xl font-semibold mt-1">{branch.code || "-"}</p>
          </UiCard>
          <UiCard className="p-4">
            <p className="text-zinc-500 text-xs">Branch id</p>
            <p className="text-white text-xs font-mono mt-2 break-all">{branch.id}</p>
          </UiCard>
        </div>

        <UiCard className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-white font-medium text-sm">Assigned Employees</h3>
            <UiButton variant="secondary" size="sm" onClick={addEmployees}>Add employees</UiButton>
          </div>
          {employees.length === 0 ? (
            <p className="text-zinc-500 text-sm">No employees assigned to this branch yet.</p>
          ) : (
            <div className="space-y-2">
              {employees.map((employee) => (
                <button
                  key={employee.id}
                  onClick={() => navigate(`/settings/employees/${employee.id}`)}
                  className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between hover:border-emerald-500/30 transition-colors"
                >
                  <div>
                    <p className="text-white text-sm font-medium">{employee.full_name}</p>
                    <p className="text-zinc-500 text-xs">{employee.email} • {employee.role}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${employee.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    {employee.is_active ? "Active" : "Inactive"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </UiCard>

        <UiCard className="p-4 border-red-500/20 space-y-3">
          <div>
            <h3 className="text-red-400 font-medium text-sm">Danger Zone</h3>
            <p className="text-zinc-500 text-xs mt-1">Deleting this branch removes it from your business.</p>
          </div>
          <UiButton variant="secondary" className="border-red-500/20 text-red-400 hover:bg-red-500/10" onClick={handleDelete} disabled={saving}>
            Delete branch
          </UiButton>
        </UiCard>
      </div>
    </AppShell>
  )
}