// src/pages/settings/ChangePassword.jsx
import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import { AppShell, UiButton, UiCard } from "../../components/ui"

export default function ChangePassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!password || !confirm) { setError("Both fields required"); return }
    if (password !== confirm) { setError("Passwords do not match"); return }
    if (password.length < 6) { setError("Minimum 6 characters"); return }

    setLoading(true)
    setError("")
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else setSaved(true)
    setLoading(false)
  }

  return (
    <AppShell
      title="Change Password"
      subtitle="Update the password for this account"
      right={<UiButton variant="secondary" size="sm" onClick={() => navigate("/settings")}>← Back</UiButton>}
    >
      <div className="space-y-4">
        {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
        {saved && <p className="text-emerald-400 text-sm bg-emerald-400/10 px-3 py-2 rounded-lg">Password updated successfully</p>}

        <UiCard className="p-4 space-y-3">
          {[
            { label: "New password", value: password, setter: setPassword },
            { label: "Confirm password", value: confirm, setter: setConfirm },
          ].map((f, i) => (
            <div key={i}>
              <label className="text-zinc-400 text-xs mb-1 block">{f.label}</label>
              <input type="password" value={f.value} onChange={e => f.setter(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600" />
            </div>
          ))}
        </UiCard>

        <UiButton variant="primary" className="w-full" onClick={handleSave} disabled={loading || saved}>
          {loading ? "Updating..." : "Update password"}
        </UiButton>
      </div>
    </AppShell>
  )
}