// src/pages/settings/Suppliers.jsx
import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import { useCurrentBusiness } from "../../hooks/useRole"
import { AppShell, UiButton, UiCard } from "../../components/ui"

export default function Suppliers() {
  const navigate = useNavigate()
  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate("/settings", { replace: true })
  }
  const [suppliers, setSuppliers] = useState([])
  const { businessId } = useCurrentBusiness()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { if (businessId) fetchSuppliers() }, [businessId])

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from("suppliers").select("*")
      .eq("business_id", businessId)
      .order("name")

    setSuppliers(data || [])
  }

  const handleAdd = async () => {
    if (!name) { setError("Supplier name required"); return }
    setLoading(true)
    setError("")

    const { error } = await supabase.from("suppliers").insert({
      business_id: businessId,
      name,
      phone: phone || null,
      email: email || null,
      address: address || null,
    })

    if (error) setError(error.message)
    else {
      setName(""); setPhone(""); setEmail(""); setAddress("")
      setAdding(false)
      fetchSuppliers()
    }
    setLoading(false)
  }

  const toggleActive = async (sup) => {
    await supabase.from("suppliers").update({ is_active: !sup.is_active }).eq("id", sup.id)
    fetchSuppliers()
  }

  return (
    <AppShell
      title="Suppliers"
      subtitle="Keep supplier contacts and status tidy"
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
            <h2 className="text-white font-semibold text-sm">New supplier</h2>
            {[
              { label: "Supplier name", value: name, setter: setName, placeholder: "Unga Group Ltd" },
              { label: "Phone", value: phone, setter: setPhone, placeholder: "0700 000 000" },
              { label: "Email", value: email, setter: setEmail, placeholder: "orders@supplier.com" },
              { label: "Address", value: address, setter: setAddress, placeholder: "Industrial Area, Nairobi" },
            ].map((f, i) => (
              <div key={i}>
                <label className="text-zinc-400 text-xs mb-1 block">{f.label}</label>
                <input type="text" value={f.value} onChange={e => f.setter(e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600" />
              </div>
            ))}
            <UiButton variant="primary" className="w-full" onClick={handleAdd} disabled={loading}>
              {loading ? "Adding..." : "Add supplier"}
            </UiButton>
          </UiCard>
        )}

        <div className="space-y-2">
          {suppliers.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-8">No suppliers yet</p>
          ) : suppliers.map((sup, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{sup.name}</p>
                <p className="text-zinc-500 text-xs">{sup.phone || sup.email || "No contact info"}</p>
              </div>
              <button onClick={() => toggleActive(sup)}
                className={`text-xs px-3 py-1.5 rounded-xl transition-colors ${
                  sup.is_active ? "bg-zinc-800 text-zinc-400 hover:text-red-400" : "bg-emerald-500/10 text-emerald-400"
                }`}>
                {sup.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}