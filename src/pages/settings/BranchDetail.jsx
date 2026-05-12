import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { getDb } from "../../lib/db"
import { supabase } from "../../lib/supabase"
import { useCurrentBusiness } from "../../hooks/useRole"
import { useInstantAuth } from "../../hooks/useInstantAuth"
import { useBranchContext } from "../../context/BranchContext"
import { useBranches } from "../../hooks/useBranches"
import { AppShell, UiButton, UiCard } from "../../components/ui"

export default function BranchDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { businessId } = useCurrentBusiness()
  const { business: instantBusiness, signOut } = useInstantAuth()
  const { refreshBranches } = useBranchContext()

  const [branch, setBranch] = useState(null)
  const [employeeList, setEmployeeList] = useState([])
  const [assignmentCount, setAssignmentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")

  const { branches: liveBranches } = useBranches(businessId)

  const loadBranch = useCallback(async () => {
    if (!id || !businessId) return

    setLoading(true)
    setError("")

    try {
      const db = await getDb()

      const localBranch = await db.branches.findOne(id).exec()
      let branchRecord = localBranch?.toJSON?.() || localBranch || liveBranches.find((item) => item.id === id) || null

      if (!branchRecord) {
        const { data: remoteBranch, error: remoteBranchError } = await supabase
          .from("branches")
          .select("*")
          .eq("id", id)
          .eq("business_id", businessId)
          .single()

        if (remoteBranchError) {
          throw remoteBranchError
        }

        if (remoteBranch) {
          await db.branches.upsert({ ...remoteBranch, _deleted: false, _modified: Date.now() })
          branchRecord = remoteBranch
        }
      }

      if (!branchRecord) {
        setBranch(null)
        setEmployeeList([])
        return
      }

      setBranch(branchRecord)
      setName(branchRecord.name || "")
      setCode(branchRecord.code || "")
      setAddress(branchRecord.address || "")
      setPhone(branchRecord.phone || "")
      setEmail(branchRecord.email || "")
    } catch (err) {
      console.error("Failed to load branch detail:", err)
      setError(err.message || "Failed to load branch")
      setBranch(null)
      setEmployeeList([])
    } finally {
      setLoading(false)
    }
  }, [businessId, id, liveBranches])

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate("/settings/branches", { replace: true })
  }

  useEffect(() => {
    void loadBranch()
  }, [loadBranch])

  useEffect(() => {
    if (!businessId || !id) return

    let sub

    const run = async () => {
      const db = await getDb()

      const query = db.branch_assignments.find({
        selector: {
          branch_id: id,
          _deleted: { $ne: true },
        },
      })

      sub = query.$.subscribe((assignments) => {
        setAssignmentCount(assignments.length)

        setEmployeeList(
          assignments.map((a) => ({
            id: a.user_id,
            role: a.role,
            branch_id: a.branch_id,
            is_active: a.is_active ?? true,
          }))
        )
      })
    }

    run()

    return () => sub?.unsubscribe()
  }, [businessId, id])

  // assignedCount is derived directly from assignment count - no memo needed
  const assignedCount = assignmentCount

  const handleSave = async () => {
    if (!branch || !name) {
      setError("Branch name is required")
      return
    }

    setSaving(true)
    setError("")

    try {
      const db = await getDb()
      const doc = await db.branches.findOne(id).exec()
      const payload = { name, code: code || null, address: address || null, phone: phone || null, email: email || null, _modified: Date.now() }
      if (doc) {
        await doc.incrementalPatch(payload)
      } else {
        await db.branches.upsert({ id, business_id: businessId, ...payload, _deleted: false })
      }

      await refreshBranches?.()
      await loadBranch()
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
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
      const db = await getDb()
      const doc = await db.branches.findOne(id).exec()
      if (doc) {
        await doc.incrementalPatch({ is_active: !branch.is_active, _modified: Date.now() })
      } else {
        await db.branches.upsert({ ...branch, is_active: !branch.is_active, _modified: Date.now() })
      }

      await refreshBranches?.()
      await loadBranch()
    } catch (err) {
      setError(err.message || "Failed to update branch status")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete ${branch?.name}? This action cannot be undone.`)) return

    setSaving(true)
    setError("")

    try {
      const db = await getDb()
      const doc = await db.branches.findOne(id).exec()
      if (doc) {
        await doc.incrementalPatch({ status: 'archived', _deleted: true, _modified: Date.now() })
      } else {
        await db.branches.upsert({ id, status: 'archived', business_id: businessId, _deleted: true, _modified: Date.now() })
      }

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
      <AppShell showHeader={false}>
        <div className="space-y-4 px-4 sm:px-5">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-xs"
          >
            <span aria-hidden="true">←</span>
            <span>Back to branches</span>
          </button>
        <div className="flex items-center justify-center py-12">
          <p className="text-zinc-500">Loading...</p>
        </div>
        </div>
      </AppShell>
    )
  }

  if (!branch) {
    return (
      <AppShell showHeader={false}>
        <div className="space-y-4 px-4 sm:px-5">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-xs"
          >
            <span aria-hidden="true">←</span>
            <span>Back to branches</span>
          </button>
        <div className="flex items-center justify-center py-12">
          <p className="text-zinc-500">Branch not found</p>
        </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      showHeader={false}
    >
      <div className="space-y-4 px-4 sm:px-5">
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-xs"
        >
          <span aria-hidden="true">←</span>
          <span>Back to branches</span>
        </button>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5 shadow-lg shadow-black/10">
          <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-500">Settings</p>
              <h1 className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-white">{branch.name || "Branch Details"}</h1>
              <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                {instantBusiness?.name || "Your business"} • Manage profile, status, and people in one place.
              </p>
            </div>

            <div className="flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:items-center">
              <UiButton variant="secondary" size="sm" onClick={addEmployees}>Employees</UiButton>
              <UiButton variant="primary" size="sm" onClick={() => setEditing((current) => !current)}>
                {editing ? "Cancel" : "Edit"}
              </UiButton>
              <UiButton
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  signOut?.()
                }}
              >
                Sign out
              </UiButton>
            </div>
          </div>
        </div>

        <div className="space-y-4">
        {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
        {saved && <p className="text-emerald-400 text-sm bg-emerald-400/10 px-3 py-2 rounded-lg">Saved successfully</p>}

        {/* Scope Badge */}
        <UiCard className="p-3 bg-zinc-800/50 border-zinc-700/50">
          <p className="text-zinc-500 text-xs uppercase tracking-wider">Current scope</p>
          <p className="text-white text-sm font-semibold mt-1">{branch.name}</p>
        </UiCard>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <UiCard className="p-4">
            <p className="text-zinc-500 text-xs">Employees</p>
            <p className="text-white text-2xl font-semibold mt-1">{assignedCount}</p>
          </UiCard>
          <UiCard className="p-4">
            <p className="text-zinc-500 text-xs">Status</p>
            <p className={`text-2xl font-semibold mt-1 ${branch.is_active ? "text-emerald-400" : "text-red-400"}`}>{branch.is_active ? "Live" : "Paused"}</p>
          </UiCard>
          <UiCard className="p-4">
            <p className="text-zinc-500 text-xs">Code</p>
            <p className="text-white text-lg font-semibold mt-2 break-all">{branch.code || "—"}</p>
          </UiCard>
          <UiCard className="p-4">
            <p className="text-zinc-500 text-xs">Branch ID</p>
            <p className="text-white text-xs font-mono mt-2 break-all">{branch.id}</p>
          </UiCard>
        </div>

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

          {!editing && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-zinc-500 text-xs uppercase tracking-wider">Contact</p>
                <div className="mt-3 space-y-1 text-sm">
                  <p className="text-white">{branch.phone || "No phone"}</p>
                  <p className="text-zinc-400 break-all">{branch.email || "No email"}</p>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-zinc-500 text-xs uppercase tracking-wider">Address</p>
                <p className="mt-3 text-sm text-zinc-200">{branch.address || "No address set"}</p>
              </div>
            </div>
          )}

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

        <UiCard className="p-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-white font-medium text-sm">Assigned Employees</h3>
            <UiButton variant="secondary" size="sm" onClick={addEmployees}>Add employees</UiButton>
          </div>
          {employeeList.length === 0 ? (
            <p className="text-zinc-500 text-sm">No employees assigned to this branch yet.</p>
          ) : (
            <div className="space-y-2">
              {employeeList.map((employee) => (
                <button
                  key={employee.id}
                  onClick={() => navigate(`/settings/employees/${employee.id}`)}
                  className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:border-emerald-500/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium">{employee.full_name}</p>
                    <p className="text-zinc-500 text-xs break-words">{employee.email} • {employee.role}</p>
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
      </div>
    </AppShell>
  )
}