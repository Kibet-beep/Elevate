// src/pages/settings/EmployeeDetails.jsx
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { AppShell, UiButton, UiCard } from "../../components/ui"

export default function EmployeeDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "cashier",
    is_active: true
  })

  useEffect(() => {
    if (id) fetchEmployeeDetails(id)
  }, [id])

  const fetchEmployeeDetails = async (employeeId) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", employeeId)
        .single()

      if (error) throw error

      setEmployee(data)
      setFormData({
        full_name: data.full_name,
        email: data.email,
        role: data.role,
        is_active: data.is_active
      })
    } catch (err) {
      setError("Failed to load employee details")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: formData.full_name,
          role: formData.role,
          is_active: formData.is_active
        })
        .eq("id", id)

      if (error) throw error

      setEmployee({ ...employee, ...formData })
      setEditing(false)
    } catch (err) {
      setError("Failed to update employee")
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove this employee? This action cannot be undone.")) {
      return
    }

    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", id)

      if (error) throw error

      navigate("/settings/employees")
    } catch (err) {
      setError("Failed to remove employee")
    }
  }

  if (loading) {
    return (
      <AppShell title="Employee Details" right={<UiButton variant="secondary" onClick={() => navigate("/settings/employees")}>← Back</UiButton>}>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      </AppShell>
    )
  }

  if (error || !employee) {
    return (
      <AppShell title="Employee Details" right={<UiButton variant="secondary" onClick={() => navigate("/settings/employees")}>← Back</UiButton>}>
        <div className="text-center py-8">
          <p className="text-red-400">{error || "Employee not found"}</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Employee Details"
      right={(
        <>
          <UiButton variant="secondary" onClick={() => navigate("/settings/employees")}>← Back</UiButton>
          {!editing && <UiButton variant="primary" onClick={() => setEditing(true)}>Edit</UiButton>}
          {editing && (
            <>
              <UiButton variant="secondary" onClick={() => setEditing(false)}>Cancel</UiButton>
              <UiButton variant="primary" onClick={handleSave}>Save</UiButton>
            </>
          )}
        </>
      )}
    >
      <div className="space-y-6">
        {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}

        {/* Employee Profile Card */}
        <UiCard className="p-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">{employee.full_name?.charAt(0)}</span>
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-zinc-400 text-xs mb-1 block">Full Name</label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs mb-1 block">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full bg-zinc-800 border border-zinc-700 text-zinc-500 rounded-xl px-4 py-2 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs mb-1 block">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-2 text-sm outline-none focus:border-emerald-500"
                    >
                      <option value="cashier">Cashier</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                    />
                    <label htmlFor="active" className="text-zinc-300 text-sm">Active Employee</label>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-white text-xl font-semibold">{employee.full_name}</h2>
                  <p className="text-zinc-500 text-sm">{employee.email}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      employee.role === "manager"
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-zinc-800 text-zinc-400"
                    }`}>
                      {employee.role === "manager" ? "Manager" : "Cashier"}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      employee.is_active
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}>
                      {employee.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </UiCard>

        {/* Additional Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UiCard className="p-4">
            <h3 className="text-white font-medium text-sm mb-3">Employment Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500 text-xs">Employee ID</span>
                <span className="text-white text-xs font-mono">{employee.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 text-xs">Date Joined</span>
                <span className="text-white text-xs">{new Date(employee.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 text-xs">Status</span>
                <span className={`text-xs ${employee.is_active ? "text-emerald-400" : "text-red-400"}`}>
                  {employee.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </UiCard>

          <UiCard className="p-4">
            <h3 className="text-white font-medium text-sm mb-3">Permissions</h3>
            <div className="space-y-2">
              {employee.role === "manager" ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 text-xs">✓</span>
                    <span className="text-zinc-300 text-xs">Manage inventory</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 text-xs">✓</span>
                    <span className="text-zinc-300 text-xs">View reports</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 text-xs">✓</span>
                    <span className="text-zinc-300 text-xs">Invite cashiers</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 text-xs">✓</span>
                    <span className="text-zinc-300 text-xs">Process sales</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 text-xs">✓</span>
                    <span className="text-zinc-300 text-xs">View inventory</span>
                  </div>
                </>
              )}
            </div>
          </UiCard>
        </div>

        {/* Danger Zone */}
        <UiCard className="p-4 border-red-500/20">
          <h3 className="text-red-400 font-medium text-sm mb-2">Danger Zone</h3>
          <p className="text-zinc-500 text-xs mb-3">Removing an employee will permanently delete their account and access.</p>
          <UiButton variant="secondary" className="border-red-500/20 text-red-400 hover:bg-red-500/10" onClick={handleDelete}>
            Remove Employee
          </UiButton>
        </UiCard>
      </div>
    </AppShell>
  )
}
