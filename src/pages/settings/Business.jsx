// src/pages/settings/Business.jsx
import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import { useCurrentBusiness } from "../../hooks/useRole"
import { AppShell, UiButton, UiCard } from "../../components/ui"

export default function Business() {
  const navigate = useNavigate()
  const { businessId } = useCurrentBusiness()
  const [name, setName] = useState("")
  const [type, setType] = useState("retail")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [location, setLocation] = useState("")
  const [kraPin, setKraPin] = useState("")
  const [regNumber, setRegNumber] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (businessId) fetchBusiness()
  }, [businessId])

  const fetchBusiness = async () => {
    const { data } = await supabase
      .from("businesses").select("*").eq("id", businessId).single()

    if (data) {
      setName(data.name || "")
      setType(data.type || "retail")
      setPhone(data.phone || "")
      setEmail(data.email || "")
      setLocation(data.location || "")
      setKraPin(data.kra_pin || "")
    setRegNumber(data.reg_number || "")
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")
    const { error } = await supabase
      .from("businesses")
      .update({ name, type, phone, email, location, kra_pin: kraPin, reg_number: regNumber })
      .eq("id", businessId)

    if (error) setError(error.message)
    else setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <AppShell
      title="Business Details"
      subtitle="Keep your trading name, contacts, and registration details current"
      right={<UiButton variant="secondary" size="sm" onClick={() => navigate("/settings")}>← Back</UiButton>}
    >
      <div className="space-y-4">
        {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
        {saved && <p className="text-emerald-400 text-sm bg-emerald-400/10 px-3 py-2 rounded-lg">Saved successfully</p>}

        <UiCard className="p-4 space-y-3">
          {[
            { label: "Business name", value: name, setter: setName, placeholder: "Kamau General Store" },
            { label: "Phone", value: phone, setter: setPhone, placeholder: "0712 345 678" },
            { label: "Email", value: email, setter: setEmail, placeholder: "business@email.com" },
            { label: "Location", value: location, setter: setLocation, placeholder: "Nairobi, Westlands" },
            { label: "KRA PIN", value: kraPin, setter: setKraPin, placeholder: "A000000000Z" },
            { label: "Registration number", value: regNumber, setter: setRegNumber, placeholder: "CPR/2024/123456" },
          ].map((f, i) => (
            <div key={i}>
              <label className="text-zinc-400 text-xs mb-1 block">{f.label}</label>
              <input
                type="text"
                value={f.value}
                onChange={e => f.setter(e.target.value)}
                placeholder={f.placeholder}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
              />
            </div>
          ))}
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">Business type</label>
            <select value={type} onChange={e => setType(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors">
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
              <option value="other">Other</option>
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