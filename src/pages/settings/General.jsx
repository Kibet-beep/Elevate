// src/pages/settings/General.jsx
import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import { useCurrentBusiness } from "../../hooks/useRole"
import { AppShell, UiButton, UiCard } from "../../components/ui"

export default function General() {
  const navigate = useNavigate()
  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate("/settings", { replace: true })
  }
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
    if (!businessId) return

    let active = true

    const fetchData = async () => {
      const { data } = await supabase
        .from("businesses").select("vat_rate, low_stock_threshold, financial_year_start")
        .eq("id", businessId).single()

      if (!active) return

      setVatRate(data.vat_rate || 16)
      setLowStockThreshold(data.low_stock_threshold || 10)
      setFinancialYearStart(data.financial_year_start || 1)
    }

    void fetchData()

    return () => {
      active = false
    }
  }, [businessId])

  const validateSettings = () => {
    if (vatRate < 0 || vatRate > 100) return "VAT rate must be between 0 and 100"
    if (lowStockThreshold <= 0) return "Low stock threshold must be greater than zero"
    if (financialYearStart < 1 || financialYearStart > 12) return "Financial year start must be a valid month"
    return null
  }

  const handleSave = async () => {
    const validationError = validateSettings()
    if (validationError) {
      setError(validationError)
      return
    }
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
      right={<UiButton variant="secondary" size="sm" onClick={goBack} aria-label="Back">←</UiButton>}
    >
      <div className="space-y-4">
        {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
        {saved && <p className="text-emerald-400 text-sm bg-emerald-400/10 px-3 py-2 rounded-lg">Saved successfully</p>}

        <UiCard className="p-4 space-y-4">
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">VAT rate (%) <span className="text-red-400">*</span></label>
            <input type="number" min="0" max="100" value={vatRate} onChange={e => setVatRate(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors" />
            <p className="text-zinc-600 text-xs mt-1">Default is 16% (Kenya standard rate). Must be 0-100.</p>
            {(vatRate < 0 || vatRate > 100) && <p className="text-red-400 text-xs mt-1">VAT rate must be between 0 and 100</p>}
          </div>
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">Low stock threshold <span className="text-red-400">*</span></label>
            <input type="number" min="1" value={lowStockThreshold} onChange={e => setLowStockThreshold(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors" />
            <p className="text-zinc-600 text-xs mt-1">Alert when any product falls below this quantity</p>
            {lowStockThreshold <= 0 && <p className="text-red-400 text-xs mt-1">Low stock threshold must be greater than zero</p>}
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

        <UiButton 
          variant="primary" 
          className="w-full" 
          onClick={handleSave} 
          disabled={saving || (vatRate < 0 || vatRate > 100) || lowStockThreshold <= 0}
        >
          {saving ? "Saving..." : "Save changes"}
        </UiButton>
      </div>
    </AppShell>
  )
}