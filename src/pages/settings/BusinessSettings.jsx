// src/pages/settings/BusinessSettings.jsx
import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import { useCurrentBusiness } from "../../hooks/useRole"
import { AppShell, UiButton, UiCard, UiSectionTitle } from "../../components/ui"

export default function BusinessSettings() {
  const navigate = useNavigate()
  const { businessId } = useCurrentBusiness()

  // Business identity
  const [name, setName] = useState("")
  const [type, setType] = useState("retail")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [location, setLocation] = useState("")
  const [kraPin, setKraPin] = useState("")
  const [regNumber, setRegNumber] = useState("")

  // Operational settings
  const [vatRate, setVatRate] = useState(16)
  const [lowStockThreshold, setLowStockThreshold] = useState(10)
  const [financialYearStart, setFinancialYearStart] = useState(1)

  // UI State
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"]

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate("/settings", { replace: true })
  }

  async function fetchBusinessSettings() {
    const { data } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single()

    if (data) {
      // Business identity
      setName(data.name || "")
      setType(data.type || "retail")
      setPhone(data.phone || "")
      setEmail(data.email || "")
      setLocation(data.location || "")
      setKraPin(data.kra_pin || "")
      setRegNumber(data.reg_number || "")

      // Operational settings
      setVatRate(data.vat_rate || 16)
      setLowStockThreshold(data.low_stock_threshold || 10)
      setFinancialYearStart(data.financial_year_start || 1)
    }
  }

  useEffect(() => {
    if (businessId) void fetchBusinessSettings()
  }, [businessId])

  const validateSettings = () => {
    if (!name.trim()) return "Business name is required"
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

    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        name,
        type,
        phone,
        email,
        location,
        kra_pin: kraPin,
        reg_number: regNumber,
        vat_rate: parseInt(vatRate),
        low_stock_threshold: parseInt(lowStockThreshold),
        financial_year_start: parseInt(financialYearStart),
      })
      .eq("id", businessId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }

    setSaving(false)
  }

  return (
    <AppShell
      title="Business Settings"
      subtitle="One place for all your business rules and identity"
      showHeader={false}
      right={<UiButton variant="secondary" size="sm" onClick={goBack} aria-label="Back">←</UiButton>}
    >
      <div className="space-y-4 max-w-2xl">
        {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
        {saved && <p className="text-emerald-400 text-sm bg-emerald-400/10 px-3 py-2 rounded-lg">All changes saved successfully</p>}

        {/* Business Identity Section */}
        <UiCard className="p-4 space-y-4">
          <UiSectionTitle
            title="Business Identity"
            caption="Your trading name, contacts, and registration details"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Business name <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Kamau General Store"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Business type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0712 345 678"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="business@email.com"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Location</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Nairobi, Westlands"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">KRA PIN</label>
              <input
                type="text"
                value={kraPin}
                onChange={e => setKraPin(e.target.value)}
                placeholder="A000000000Z"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-zinc-400 text-xs mb-1 block">Registration number</label>
              <input
                type="text"
                value={regNumber}
                onChange={e => setRegNumber(e.target.value)}
                placeholder="CPR/2024/123456"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
              />
            </div>
          </div>
        </UiCard>

        {/* Operational Settings Section */}
        <UiCard className="p-4 space-y-4">
          <UiSectionTitle
            title="Operational Settings"
            caption="Tax, inventory thresholds, and financial year"
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">VAT rate (%) <span className="text-red-400">*</span></label>
              <input
                type="number"
                min="0"
                max="100"
                value={vatRate}
                onChange={e => setVatRate(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="text-zinc-600 text-xs mt-1">Kenya standard: 16%</p>
              {(vatRate < 0 || vatRate > 100) && <p className="text-red-400 text-xs mt-1">Must be 0-100</p>}
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Low stock threshold <span className="text-red-400">*</span></label>
              <input
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={e => setLowStockThreshold(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="text-zinc-600 text-xs mt-1">Alert below this qty</p>
              {lowStockThreshold <= 0 && <p className="text-red-400 text-xs mt-1">Must be {'>'}0</p>}
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Financial year starts <span className="text-red-400">*</span></label>
              <select
                value={financialYearStart}
                onChange={e => setFinancialYearStart(parseInt(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors"
              >
                {months.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </UiCard>

        {/* Save Button */}
        <UiButton
          variant="primary"
          className="w-full"
          onClick={handleSave}
          disabled={saving || validateSettings() !== null}
        >
          {saving ? "Saving..." : "Save all settings"}
        </UiButton>

        {/* Info Card */}
        <UiCard className="p-4 bg-zinc-800/50 border-zinc-700/50">
          <p className="text-zinc-400 text-xs leading-relaxed">
            <strong>All settings are applied business-wide</strong>. Changes to VAT rate, stock thresholds, and financial year will affect all branches and products immediately.
          </p>
        </UiCard>
      </div>
    </AppShell>
  )
}
