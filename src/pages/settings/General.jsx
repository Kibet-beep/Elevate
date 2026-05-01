// src/pages/settings/General.jsx
import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import { useCurrentBusiness } from "../../hooks/useRole"
import { AppShell, UiButton, UiCard } from "../../components/ui"

export default function General() {
  const navigate = useNavigate()
  const { businessId } = useCurrentBusiness()
  const [vatRate, setVatRate] = useState(16)
  const [lowStockThreshold, setLowStockThreshold] = useState(10)
  const [financialYearStart, setFinancialYearStart] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  const months = ["January","February","March","April","May","June",
    "July","August","September","October","November","December"]

  useEffect(() => {
    if (businessId) fetchData()
  }, [businessId])

  const fetchData = async () => {
    const { data } = await supabase
      .from("businesses").select("vat_rate, low_stock_threshold, financial_year_start")
      .eq("id", businessId).single()

    setVatRate(data.vat_rate || 16)
    setLowStockThreshold(data.low_stock_threshold || 10)
    setFinancialYearStart(data.financial_year_start || 1)
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")
    const { error } = await supabase
      .from("businesses")
      .update({ vat_rate: vatRate, low_stock_threshold: lowStockThreshold, financial_year_start: financialYearStart })
      .eq("id", businessId)

    if (error) setError(error.message)
    else setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <AppShell
      title="General Preferences"
      subtitle="VAT rate, stock threshold, and financial year settings"
      showHeader={false}
      right={<UiButton variant="secondary" size="sm" onClick={() => navigate("/settings")}>← Back</UiButton>}
    >
      <div className="space-y-4">
        {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
        {saved && <p className="text-emerald-400 text-sm bg-emerald-400/10 px-3 py-2 rounded-lg">Saved successfully</p>}

        <UiCard className="p-4 space-y-4">
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">VAT rate (%)</label>
            <input type="number" value={vatRate} onChange={e => setVatRate(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors" />
            <p className="text-zinc-600 text-xs mt-1">Default is 16% (Kenya standard rate)</p>
          </div>
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">Low stock threshold</label>
            <input type="number" value={lowStockThreshold} onChange={e => setLowStockThreshold(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors" />
            <p className="text-zinc-600 text-xs mt-1">Alert when any product falls below this quantity</p>
          </div>
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">Financial year starts</label>
            <select value={financialYearStart} onChange={e => setFinancialYearStart(parseInt(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors">
              {months.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        </UiCard>

        <UiButton variant="primary" className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </UiButton>
      </div>
    </AppShell>
  )
}