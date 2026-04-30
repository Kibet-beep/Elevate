// src/pages/onboarding/AddEmployees.jsx
import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`

export default function AddEmployees() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("cashier")
  const [inviting, setInviting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [fieldError, setFieldError] = useState("")

  const handleInvite = async () => {
    setFieldError("")

    if (!fullName.trim()) { setFieldError("Full name is required"); return }
    if (!email.trim()) { setFieldError("Email is required"); return }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) { setFieldError("Please enter a valid email address"); return }

    if (employees.find(e => e.email.toLowerCase() === email.trim().toLowerCase())) {
      setFieldError("This email has already been added")
      return
    }

    setInviting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setFieldError("You must be logged in to invite employees")
        setInviting(false)
        return
      }

      const res = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: email.trim(),
          fullName: fullName.trim(),
          role,
        }),
      })

      const result = await res.json()
      console.log("Response status:", res.status)
      console.log("Response body:", JSON.stringify(result))

      if (!res.ok) {
        setFieldError(result.error || "Failed to send invite")
        setInviting(false)
        return
      }

      setEmployees([...employees, {
        fullName: fullName.trim(),
        email: email.trim(),
        role,
        status: "invited",
      }])

      setFullName("")
      setEmail("")
      setRole("cashier")

    } catch (err) {
      console.log("Catch error:", err)
      setFieldError("Network error — please try again")
    }

    setInviting(false)
  }

  const removeEmployee = (index) => {
    setEmployees(employees.filter((_, i) => i !== index))
  }

  const handleContinue = async () => {
    setSaving(true)
    navigate("/onboarding/done")
    setSaving(false)
  }

  const roleLabel = (r) => r === "cashier" ? "Cashier" : "Manager"

  return (
    <div className="min-h-screen bg-zinc-950 pb-16">
      <div className="px-5 pt-8 pb-6">
        <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-3">Onboarding · Step 2</p>
        <h1 className="text-white font-bold text-2xl tracking-tight">Add your team</h1>
        <p className="text-zinc-500 text-sm mt-1.5 leading-relaxed">
          Invite cashiers and managers. Each person gets an email to set their password and activate their account.
        </p>
      </div>

      <div className="px-5 max-w-lg mx-auto space-y-4">

        {error && (
          <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* ── TEAM LIST ── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-medium mb-4">
            Your team · {employees.length} invited
          </p>

          {employees.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-zinc-600 text-sm">No one invited yet.</p>
              <p className="text-zinc-700 text-xs mt-1">Add someone below to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {employees.map((e, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{e.fullName}</p>
                    <p className="text-zinc-500 text-xs font-mono mt-0.5 truncate">{e.email}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full ${
                      e.role === "manager"
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-zinc-800 text-zinc-400"
                    }`}>
                      {roleLabel(e.role)}
                    </span>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                      Invited ✓
                    </span>
                    <button
                      onClick={() => removeEmployee(i)}
                      className="text-zinc-600 hover:text-red-400 transition-colors text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── INVITE FORM ── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-medium">
            Invite someone
          </p>

          {fieldError && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{fieldError}</p>
            </div>
          )}

          <div>
            <label className="text-zinc-400 text-xs mb-2 block">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Jane Wanjiku"
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
            />
          </div>

          <div>
            <label className="text-zinc-400 text-xs mb-2 block">Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jane@business.com"
              onKeyDown={e => e.key === "Enter" && handleInvite()}
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
            />
          </div>

          <div>
            <label className="text-zinc-400 text-xs mb-2 block">Role</label>
            <div className="flex gap-2">
              {["cashier", "manager"].map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors capitalize ${
                    role === r
                      ? "bg-emerald-500 text-black"
                      : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {roleLabel(r)}
                </button>
              ))}
            </div>
            <p className="text-zinc-600 text-xs mt-2">
              {role === "cashier"
                ? "Can record sales and view their own shift."
                : "Can manage inventory, view reports, and invite cashiers."}
            </p>
          </div>

          <button
            onClick={handleInvite}
            disabled={inviting}
            className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-medium rounded-xl py-3 text-sm transition-colors"
          >
            {inviting ? "Sending invite..." : "+ Send invite"}
          </button>
        </div>

        {/* ── HOW IT WORKS ── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-medium mb-3">How it works</p>
          <div className="space-y-3">
            {[
              { step: "1", text: "They receive an email from Elevate with an activation link" },
              { step: "2", text: "They click the link and set their own password" },
              { step: "3", text: "Their account is activated and they can log in" },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-500 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {s.step}
                </span>
                <p className="text-zinc-400 text-sm leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── ACTIONS ── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/onboarding/done")}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-medium rounded-xl py-3.5 text-sm transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleContinue}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold rounded-xl py-3.5 text-sm transition-colors"
          >
            {saving ? "Saving..." : "Continue →"}
          </button>
        </div>

        <div className="h-4" />
      </div>
    </div>
  )
}