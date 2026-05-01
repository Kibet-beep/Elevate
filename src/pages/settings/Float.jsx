// src/pages/settings/Float.jsx
import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import { useCurrentBusiness } from "../../hooks/useRole"
import { AppShell, UiButton, UiCard } from "../../components/ui"

export default function Float() {
  const navigate = useNavigate()
  const { businessId } = useCurrentBusiness()
  const [userId, setUserId] = useState(null)
  const [cash, setCash] = useState("")
  const [mpesa, setMpesa] = useState("")
  const [bank, setBank] = useState("")
  const [lastSet, setLastSet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (businessId) fetchFloat()
  }, [businessId])

  const fetchFloat = async () => {
    const { data } = await supabase
      .from("float_baseline")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle()

    if (data) {
      setCash(data.cash_opening)
      setMpesa(data.mpesa_opening)
      setBank(data.bank_opening)
      setLastSet(data.set_date)
    }

    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")

    const payload = {
      business_id: businessId,
      cash_opening: parseFloat(cash) || 0,
      mpesa_opening: parseFloat(mpesa) || 0,
      bank_opening: parseFloat(bank) || 0,
      set_date: new Date().toISOString(),
      created_by: userId,
      updated_at: new Date().toISOString(),
    }

    // Upsert — insert if not exists, update if exists
    const { error } = await supabase
      .from("float_baseline")
      .upsert(payload, { onConflict: "business_id" })

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      setLastSet(new Date().toISOString())
      setTimeout(() => setSaved(false), 2000)
    }

    setSaving(false)
  }

  const fmt = (n) => `KES ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <p className="text-zinc-500 text-sm">Loading...</p>
    </div>
  )

  return (
    <AppShell
      title="Float"
      subtitle="Your opening account balances"
      showHeader={false}
      right={<UiButton variant="secondary" size="sm" onClick={() => navigate("/settings")}>← Back</UiButton>}
    >
      <div className="space-y-4">

        {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
        {saved && <p className="text-emerald-400 text-sm bg-emerald-400/10 px-3 py-2 rounded-lg">Float updated successfully</p>}

        {lastSet && (
          <UiCard className="px-4 py-3 flex items-center justify-between">
            <p className="text-zinc-500 text-xs">Last set on</p>
            <p className="text-zinc-300 text-xs">{new Date(lastSet).toLocaleDateString("en-KE", {
              weekday: "short", year: "numeric", month: "short", day: "numeric"
            })}</p>
          </UiCard>
        )}

        <UiCard className="border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <p className="text-amber-400 text-xs font-medium">Important</p>
          <p className="text-zinc-400 text-xs mt-1">
            Set this to the actual money you have right now in each account. 
            All future balances will be calculated from this point forward.
            Updating this will reset your baseline.
          </p>
        </UiCard>

        <UiCard className="p-4 space-y-4">
          <h2 className="text-white font-semibold text-sm">Opening balances</h2>

          {[
            { label: "Cash", value: cash, setter: setCash, icon: "💵", desc: "Physical cash in hand or till" },
            { label: "M-Pesa", value: mpesa, setter: setMpesa, icon: "📱", desc: "Balance in your M-Pesa account" },
            { label: "Bank", value: bank, setter: setBank, icon: "🏦", desc: "Balance in your bank account" },
          ].map((f, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-1">
                <span>{f.icon}</span>
                <label className="text-zinc-300 text-sm font-medium">{f.label}</label>
              </div>
              <p className="text-zinc-600 text-xs mb-2">{f.desc}</p>
              <input
                type="number"
                value={f.value}
                onChange={e => f.setter(e.target.value)}
                placeholder="0.00"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
              />
            </div>
          ))}
        </UiCard>

        {/* Total */}
        <UiCard className="px-4 py-3 flex items-center justify-between">
          <p className="text-zinc-400 text-sm">Total float</p>
          <p className="text-emerald-400 font-mono font-bold text-sm">
            {fmt((parseFloat(cash) || 0) + (parseFloat(mpesa) || 0) + (parseFloat(bank) || 0))}
          </p>
        </UiCard>

        <UiButton variant="primary" className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save float"}
        </UiButton>
      </div>
    </AppShell>
  )
}