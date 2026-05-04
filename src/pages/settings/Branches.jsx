import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import { useUser, useCurrentBusiness } from "../../hooks/useRole"
import { AppShell, UiButton, UiCard } from "../../components/ui"
import { useBranchContext } from "../../hooks/useBranchContext"

export default function Branches() {
  const navigate = useNavigate()
  const { user: authUser } = useUser()
  const { businessId } = useCurrentBusiness()
  const { availableBranches, refreshBranches } = useBranchContext()
  
  const [branches, setBranches] = useState([])
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

  useEffect(() => {
    if (businessId) fetchBranches()
  }, [businessId])

  const fetchBranches = async () => {
    const { data } = await supabase
      .from("branches")
      .select("*")
      .eq("business_id", businessId)
      .order("name")

    setBranches(data || [])
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
        business_id: businessId,
        name,
        code: code || null,
        address: address || null,
        phone: phone || null,
        email: email || null,
      }

      if (editing) {
        const { error } = await supabase
          .from("branches")
          .update(branchData)
          .eq("id", editing.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from("branches")
          .insert(branchData)

        if (error) throw error
      }

      // Reset form
      setName("")
      setCode("")
      setAddress("")
      setPhone("")
      setEmail("")
      setAdding(false)
      setEditing(null)
      
      // Refresh data
      await fetchBranches()
      if (refreshBranches) refreshBranches()

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
      const { error } = await supabase
        .from("branches")
        .update({ is_active: !branch.is_active })
        .eq("id", branch.id)

      if (error) throw error
      
      await fetchBranches()
      if (refreshBranches) refreshBranches()
    } catch (error) {
      setError(error.message)
    }
  }

  const handleDelete = async (branch) => {
    if (!confirm(`Are you sure you want to delete ${branch.name}?`)) return

    try {
      const { error } = await supabase
        .from("branches")
        .delete()
        .eq("id", branch.id)

      if (error) throw error
      
      await fetchBranches()
      if (refreshBranches) refreshBranches()
    } catch (error) {
      setError(error.message)
    }
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
      subtitle="Manage your business locations"
      showHeader={false}
      right={(
        <div className="flex items-center gap-1.5 sm:gap-3 max-w-[calc(100vw-2rem)] sm:max-w-none">
          <UiButton variant="secondary" size="sm" onClick={goBack} className="flex-shrink-0 text-xs px-2 sm:px-3" aria-label="Back">←</UiButton>
          <UiButton variant="primary" size="sm" onClick={() => setAdding(!adding)} className="flex-shrink-0 text-xs px-2 sm:px-3">{adding ? "Cancel" : "+ Add"}</UiButton>
        </div>
      )}
    >
      <div className="space-y-4">
        {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}

        {adding && (
          <UiCard className="p-4 space-y-3">
            <h2 className="text-white font-semibold text-sm">{editing ? "Edit branch" : "New branch"}</h2>
            
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

            <UiButton variant="primary" className="w-full" onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : (editing ? "Update branch" : "Add branch")}
            </UiButton>
          </UiCard>
        )}

        <div className="space-y-2">
          {branches.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-8">No branches yet</p>
          ) : branches.map((branch) => (
            <div
              key={branch.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 flex items-center justify-between hover:border-emerald-500/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{branch.name?.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{branch.name}</p>
                  <p className="text-zinc-500 text-xs">
                    {branch.code && `${branch.code} · `}
                    {branch.address || "No address"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${
                  branch.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                }`}>
                  {branch.is_active ? "Active" : "Inactive"}
                </span>
                
                <button
                  onClick={() => handleEdit(branch)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex-shrink-0"
                >
                  Edit
                </button>
                
                <button
                  onClick={() => toggleActive(branch)}
                  className={`text-xs px-3 py-1.5 rounded-xl transition-colors flex-shrink-0 ${
                    branch.is_active ? "bg-zinc-800 text-zinc-400 hover:text-red-400" : "bg-emerald-500/10 text-emerald-400"
                  }`}
                >
                  {branch.is_active ? "Deactivate" : "Activate"}
                </button>
                
                <button
                  onClick={() => handleDelete(branch)}
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
