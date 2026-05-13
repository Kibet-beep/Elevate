// src/pages/settings/Float.jsx
import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { getFloat, saveFloat } from "../../services/floatService"
import { useNavigate } from "react-router-dom"
import { useCurrentBusiness } from "../../hooks/useRole"
import { useInstantAuth } from "../../hooks/useInstantAuth"
import { AppShell, UiButton, UiCard, SyncTicks } from "../../components/ui"

export default function Float() {
  const navigate = useNavigate()
  const { business: instantBusiness, signOut } = useInstantAuth()
  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate("/settings", { replace: true })
  }
  const { businessId } = useCurrentBusiness()
  const [cash, setCash] = useState("")
  const [mpesa, setMpesa] = useState("")
  const [bank, setBank] = useState("")
  const [lastSet, setLastSet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!businessId) return

    let active = true

    const fetchFloat = async () => {
      const data = await getFloat(businessId)

      if (!active) return

      if (data) {
        setCash(data.cash_opening)
        setMpesa(data.mpesa_opening)
        setBank(data.bank_opening)
        setLastSet(data.set_date)
      }

      setLoading(false)
    }

    void fetchFloat()

    return () => {
      active = false
    }
  }, [businessId])

  const handleSave = async () => {
    setSaving(true)
    setError("")
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await saveFloat(businessId, { cash, mpesa, bank }, user?.id)
      setSaved(true)
      setLastSet(new Date().toISOString())
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.message)
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
    <AppShell showHeader={false} className="pb-24" contentClassName="max-w-4xl space-y-4">
      {/* Back button */}
      <div className="px-4 sm:px-5 pt-4 pb-2">
        <button onClick={goBack} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm">
          ← Back
        </button>
      </div>
      
      {/* Hero header */}
      <div className="px-4 sm:px-5 pb-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5 shadow-lg shadow-black/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Settings</p>
              <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">Float</h1>
              <p className="mt-1 text-zinc-400 text-xs sm:text-sm">
                {instantBusiness?.name} • Your opening account balances
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => signOut()} className="text-zinc-400 hover:text-red-400 transition-colors text-sm">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 sm:px-5">
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
              Set this to actual money you have right now in each account. 
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
            <span className="inline-flex items-center justify-center gap-2">
              {saving ? <SyncTicks status="pending" /> : saved ? <SyncTicks status="synced" /> : null}
              {saving ? "Saving..." : "Save float"}
            </span>
          </UiButton>
        </div>
      </div>
    </AppShell>
  )
}
