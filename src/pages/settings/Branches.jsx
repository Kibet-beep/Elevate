import { useState, useMemo } from "react"
import { getDb } from "../../lib/db"
import { useNavigate } from "react-router-dom"
import { useCurrentBusiness } from "../../hooks/useRole"
import { useInstantAuth } from "../../hooks/useInstantAuth"
import { AppShell, UiButton, UiCard } from "../../components/ui"
import { useBranchContext } from "../../context/BranchContext"
import { useBranches } from "../../hooks/useBranches"

export default function Branches() {
  const navigate = useNavigate()
  const { businessId } = useCurrentBusiness()
  const { business } = useInstantAuth()
  const { availableBranches, refreshBranches } = useBranchContext()
  const resolvedBusinessId = businessId || business?.id
  const { branches: liveBranches } = useBranches(resolvedBusinessId)
  const [search, setSearch] = useState("")
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  // Form state
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")

  const branches = useMemo(
    () => (liveBranches.length > 0 ? liveBranches : (availableBranches || [])),
    [liveBranches, availableBranches],
  )

  const activeBranches = useMemo(() => branches
    .filter((branch) => branch.is_active)
    .filter((branch) => branch.name.toLowerCase().includes(search.toLowerCase()) || 
                        (branch.code && branch.code.toLowerCase().includes(search.toLowerCase())))
  , [branches, search])
  const inactiveBranches = useMemo(() => branches
    .filter((branch) => !branch.is_active)
    .filter((branch) => branch.name.toLowerCase().includes(search.toLowerCase()) ||
                        (branch.code && branch.code.toLowerCase().includes(search.toLowerCase())))
  , [branches, search])

  const resetForm = () => {
    setName("")
    setCode("")
    setAddress("")
    setPhone("")
    setEmail("")
    setEditing(null)
  }

  const openCreateForm = () => {
    resetForm()
    setAdding(true)
  }

  const closeForm = () => {
    resetForm()
    setAdding(false)
  }

  const handleSave = async () => {
    setError("")
    
    if (!name) {
      setError("Branch name is required")
      return
    }

    setLoading(true)

    try {
        const branchData = {
        business_id: resolvedBusinessId,
        name,
        code: code || null,
        address: address || null,
        phone: phone || null,
        email: email || null,
      }

      if (!resolvedBusinessId) {
        setError("Business is still loading. Please try again in a moment.")
        return
      }

      const db = await getDb()

      if (editing) {
        const doc = await db.branches.findOne(editing.id).exec()
        if (doc) {
          await doc.incrementalPatch({ ...branchData, _modified: Date.now(), _deleted: false })
        } else {
          await db.branches.upsert({ id: editing.id, ...branchData, _modified: Date.now(), _deleted: false })
        }

        closeForm()
        if (refreshBranches) refreshBranches()
        return
      } else {
        const id = crypto.randomUUID()
        await db.branches.insert({ id, ...branchData, is_active: true, status: 'active', _modified: Date.now(), _deleted: false })

        closeForm()
        if (refreshBranches) refreshBranches()
        navigate(`/settings/branches/${id}`)
        return
      }

    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (branch) => {
    setEditing(branch)
    setName(branch.name)
    setCode(branch.code || "")
    setAddress(branch.address || "")
    setPhone(branch.phone || "")
    setEmail(branch.email || "")
    setAdding(true)
  }

  const toggleActive = async (branch) => {
    try {
      const db = await getDb()
      const doc = await db.branches.findOne(branch.id).exec()
      if (doc) {
        await doc.incrementalPatch({ is_active: !branch.is_active, _modified: Date.now() })
      } else {
        await db.branches.upsert({ ...branch, is_active: !branch.is_active, _modified: Date.now() })
      }
      if (refreshBranches) refreshBranches()
    } catch (error) {
      setError(error.message)
    }
  }

  const handleDelete = async (branch) => {
    if (!confirm(`Are you sure you want to delete ${branch.name}? This action cannot be undone.`)) return

    try {
      const db = await getDb()
      const doc = await db.branches.findOne(branch.id).exec()
      if (doc) {
        await doc.incrementalPatch({ status: 'archived', _modified: Date.now() })
      } else {
        await db.branches.upsert({ ...branch, status: 'archived', _modified: Date.now() })
      }
      if (refreshBranches) refreshBranches()
    } catch (error) {
      setError(error.message)
    }
  }

  const manageBranchEmployees = (branch) => {
    navigate("/settings/branch-employees", {
      state: { branchId: branch.id, branchName: branch.name },
    })
  }

  const viewBranchDetails = (branch) => {
    navigate(`/settings/branches/${branch.id}`)
  }

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate("/settings", { replace: true })
  }

  return (
    <AppShell
      title="Branches"
      subtitle="Create, inspect, and switch between locations without leaving settings"
      showHeader={true}
      right={(
        <div className="flex items-center gap-1.5 sm:gap-3 max-w-[calc(100vw-2rem)] sm:max-w-none">
          <UiButton variant="secondary" size="sm" type="button" onClick={goBack} className="flex-shrink-0 text-xs px-2 sm:px-3" aria-label="Back">←</UiButton>
          <UiButton variant="primary" size="sm" type="button" onClick={adding ? closeForm : openCreateForm} className="flex-shrink-0 text-xs px-2 sm:px-3">
            {adding ? "Cancel" : "Add branch"}
          </UiButton>
        </div>
      )}
    >
      <div className="space-y-4">
        {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}

        {/* Scope Badge */}
        <UiCard className="p-3 bg-zinc-800/50 border-zinc-700/50">
          <p className="text-zinc-500 text-xs uppercase tracking-wider">Business scope</p>
          <p className="text-white text-sm font-semibold mt-1">All branches</p>
        </UiCard>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or code..."
          className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
        />

        <div className="grid grid-cols-3 gap-3">
          <UiCard className="p-4">
            <p className="text-zinc-500 text-xs">Total branches</p>
            <p className="text-white text-2xl font-semibold mt-1">{branches.length}</p>
          </UiCard>
          <UiCard className="p-4">
            <p className="text-zinc-500 text-xs">Active</p>
            <p className="text-emerald-400 text-2xl font-semibold mt-1">{activeBranches.length}</p>
          </UiCard>
          <UiCard className="p-4">
            <p className="text-zinc-500 text-xs">Inactive</p>
            <p className="text-red-400 text-2xl font-semibold mt-1">{inactiveBranches.length}</p>
          </UiCard>
        </div>

        {adding && (
          <UiCard className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-white font-semibold text-sm">{editing ? "Edit branch" : "New branch"}</h2>
                <p className="text-zinc-500 text-xs mt-1">Keep branch names short and codes unique for easier filtering.</p>
              </div>
              {editing && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 font-medium">Editing</span>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Branch name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Main Branch"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
                />
              </div>
              
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Branch code</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="HQ-001"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Address</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="123 Main Street, Nairobi"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0700 000 000"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
                />
              </div>
              
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="branch@business.com"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <UiButton variant="primary" type="button" className="w-full" onClick={handleSave} disabled={loading}>
                {loading ? "Saving..." : (editing ? "Update branch" : "Add branch")}
              </UiButton>
              <UiButton
                variant="secondary"
                className="w-full"
                type="button"
                onClick={() => {
                  closeForm()
                }}
              >
                Cancel
              </UiButton>
            </div>
          </UiCard>
        )}

        <div className="space-y-2">
          {branches.length === 0 ? (
            <UiCard className="p-8 text-center">
              <p className="text-white text-sm font-medium">No branches yet</p>
              <p className="text-zinc-500 text-xs mt-1">Create your first branch to start assigning employees and switching locations.</p>
              <UiButton variant="primary" type="button" className="mt-4" onClick={openCreateForm}>
                Create branch
              </UiButton>
            </UiCard>
          ) : branches.map((branch) => (
            <div
              key={branch.id}
              role="button"
              tabIndex={0}
              onClick={() => viewBranchDetails(branch)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  viewBranchDetails(branch)
                }
              }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between hover:border-emerald-500/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{branch.name?.charAt(0)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium">{branch.name}</p>
                  <p className="text-zinc-500 text-xs break-words">
                    {branch.code || "No code"} · {branch.address || "No address"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {branch.phone && <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">{branch.phone}</span>}
                    {branch.email && <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">{branch.email}</span>}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:justify-end">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${
                  branch.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                }`}>
                  {branch.is_active ? "Active" : "Inactive"}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    viewBranchDetails(branch)
                  }}
                  className="text-xs px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex-shrink-0"
                >
                  View
                </button>

                <button
                  onClick={() => manageBranchEmployees(branch)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="text-xs px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors flex-shrink-0"
                >
                  Employees
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit(branch)
                  }}
                  className="text-xs px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex-shrink-0"
                >
                  Edit
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleActive(branch)
                  }}
                  className={`text-xs px-3 py-1.5 rounded-xl transition-colors flex-shrink-0 ${
                    branch.is_active ? "bg-zinc-800 text-zinc-400 hover:text-red-400" : "bg-emerald-500/10 text-emerald-400"
                  }`}
                >
                  {branch.is_active ? "Deactivate" : "Activate"}
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(branch)
                  }}
                  className="text-xs px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex-shrink-0"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
