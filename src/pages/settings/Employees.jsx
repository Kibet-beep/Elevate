// src/pages/settings/Employees.jsx
import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import { useUser, useCurrentBusiness } from "../../hooks/useRole"
import { AppShell, UiButton, UiCard } from "../../components/ui"

export default function Employees() {
  const navigate = useNavigate()
  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate("/settings", { replace: true })
  }
  const { user: authUser } = useUser()
  const [employees, setEmployees] = useState([])
  const { businessId } = useCurrentBusiness()
  const [adding, setAdding] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("cashier")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { if (businessId) fetchEmployees() }, [businessId])

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("users").select("*")
      .eq("business_id", businessId)
      .order("created_at")

    setEmployees(data || [])
  }

  const handleAddEmployee = async () => {
    setError("")

    if (!fullName || !email || !password) {
      setError("Name, email and password are required")
      return
    }

    if (!businessId) {
      setError("Business ID not loaded. Please refresh the page.")
      return
    }

    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      setError("Your session has expired. Please sign in again.")
      setLoading(false)
      return
    }

    const requestBody = {
      email,
      password,
      fullName,
      role,
      businessId,
    }
    console.log("Sending create-employee request with:", requestBody)

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-employee`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      }
    )

    let result
    try {
      result = await response.json()
    } catch (e) {
      setError(`Server error: ${response.status} ${response.statusText}`)
      setLoading(false)
      return
    }

    if (!response.ok) {
      const errorMessage = result.error || `Request failed with status ${response.status}`
      setError(errorMessage)
      console.error("Employee creation failed:", { 
        status: response.status, 
        error: result,
        sent: requestBody
      })
      setLoading(false)
      return
    }

    if (result.error) {
      setError(result.error)
    } else {
      setFullName("")
      setEmail("")
      setPassword("")
      setRole("cashier")
      setAdding(false)
      fetchEmployees()
    }

    setLoading(false)
  }

  const toggleActive = async (emp) => {
    await supabase.from("users").update({ is_active: !emp.is_active }).eq("id", emp.id)
    fetchEmployees()
  }

  return (
    <AppShell
      title="Employees"
      subtitle="Manage your team and access roles"
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
            <h2 className="text-white font-semibold text-sm">New employee</h2>
            {[
              { label: "Full name", value: fullName, setter: setFullName, placeholder: "Jane Wanjiku" },
              { label: "Email", value: email, setter: setEmail, placeholder: "jane@business.com" },
            ].map((f, i) => (
              <div key={i}>
                <label className="text-zinc-400 text-xs mb-1 block">{f.label}</label>
                <input type={f.type || "text"} value={f.value} onChange={e => f.setter(e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600" />
              </div>
            ))}
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Temporary password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Role</label>
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors">
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <UiButton variant="primary" className="w-full" onClick={handleAddEmployee} disabled={loading}>
              {loading ? "Adding..." : "Add employee"}
            </UiButton>
          </UiCard>
        )}

        <div className="space-y-2">
          {employees.map((emp, i) => (
            <div 
              key={i} 
              className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 flex items-center justify-between hover:border-emerald-500/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/settings/employees/${emp.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{emp.full_name?.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{emp.full_name}
                    {emp.id === authUser.id && <span className="text-zinc-500 text-xs ml-1">(you)</span>}
                  </p>
                  <p className="text-zinc-500 text-xs capitalize">{emp.role} · {emp.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${
                  emp.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                }`}>
                  {emp.is_active ? "Active" : "Inactive"}
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