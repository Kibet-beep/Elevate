// src/pages/inventory/NewStock.jsx
import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import { AppShell, UiButton, UiCard, UiSectionTitle } from "../../components/ui"

export default function NewStock() {
  const navigate = useNavigate()
  const [businessId, setBusinessId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Product
  const [isNewProduct, setIsNewProduct] = useState(true)
  const [existingProducts, setExistingProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productSearch, setProductSearch] = useState("")
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [unit, setUnit] = useState("")

  // Sourcing
  const [sourcingType, setSourcingType] = useState("local")
  const [supplierId, setSupplierId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [totalPurchaseCost, setTotalPurchaseCost] = useState("")
  const [shippingClearingCost, setShippingClearingCost] = useState("")
  const [vatType, setVatType] = useState("inclusive")
  const [additionalCosts, setAdditionalCosts] = useState([])

  // Pricing
  const [sellingPrice, setSellingPrice] = useState("")
  const [composerStep, setComposerStep] = useState(1)

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase
      .from("users")
      .select("business_id")
      .eq("id", user.id)
      .single()

    setBusinessId(userData.business_id)
    setUserId(user.id)

    const { data: suppliersData } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("business_id", userData.business_id)
      .eq("is_active", true)

    setSuppliers(suppliersData || [])

    const { data: productsData } = await supabase
      .from("products")
      .select("id, name, sku_id, selling_price, unit_of_measure")
      .eq("business_id", userData.business_id)
      .eq("is_active", true)
      .order("name")

    setExistingProducts(productsData || [])
  }

  const generateSKU = (productName) => {
    const words = productName.trim().toUpperCase().split(" ")
    const base = words.map(w => w.slice(0, 3)).join("-")
    const suffix = Math.floor(Math.random() * 900 + 100)
    return `${base}-${suffix}`
  }

  // ── CALCULATIONS ──
  const qty = parseFloat(quantity) || 0
  const totalPurchase = parseFloat(totalPurchaseCost) || 0
  const shippingClearing = parseFloat(shippingClearingCost) || 0
  const unitCost = qty > 0 ? totalPurchase / qty : 0
  const stockValue = totalPurchase
  const fc = shippingClearing
  const additionalTotal = additionalCosts.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)
  const cif = totalPurchase + shippingClearing

  const importDuty = sourcingType === "import" ? cif * 0.25 : 0
  const idf = sourcingType === "import" ? cif * 0.035 : 0
  const rdl = sourcingType === "import" ? cif * 0.02 : 0
  const vatOnImport = sourcingType === "import" ? (cif + importDuty) * 0.16 : 0
  const totalDuties = importDuty + idf + rdl + vatOnImport

  const totalLandedCost = stockValue + fc + totalDuties + additionalTotal
  const landedCostPerUnit = qty > 0 ? totalLandedCost / qty : 0

  const suggestedLow = Math.ceil(landedCostPerUnit * 1.4)
  const suggestedHigh = Math.ceil(landedCostPerUnit * 1.8)

  const sp = parseFloat(sellingPrice) || 0
  const profitPerUnit = sp - landedCostPerUnit
  const profitTotal = profitPerUnit * qty

  const canProceedStep1 = isNewProduct ? Boolean(name.trim()) : Boolean(selectedProduct)
  const canProceedStep2 = Boolean(quantity) && Boolean(totalPurchaseCost)
  const canProceedStep3 = Boolean(sellingPrice)
  const canSubmit = canProceedStep1 && canProceedStep2 && canProceedStep3

  const fmt = (n) => `KES ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
  const fmtShort = (n) => `KES ${Math.round(n).toLocaleString("en-KE")}`

  // ── ADDITIONAL COSTS ──
  const addCostLine = () => setAdditionalCosts([...additionalCosts, { label: "", amount: "" }])
  const updateCostLine = (index, field, value) => {
    const updated = [...additionalCosts]
    updated[index][field] = value
    setAdditionalCosts(updated)
  }
  const removeCostLine = (index) => setAdditionalCosts(additionalCosts.filter((_, i) => i !== index))

  // ── SUBMIT ──
  const handleSubmit = async () => {
    setError("")
    if (!quantity || !totalPurchaseCost) { setError("Quantity and total purchase cost are required"); return }
    if (isNewProduct && !name) { setError("Product name is required"); return }
    if (!isNewProduct && !selectedProduct) { setError("Please select an existing product"); return }
    if (!sellingPrice) { setError("Selling price is required"); return }

    setLoading(true)
    let productId = selectedProduct?.id

    if (isNewProduct) {
      const sku = generateSKU(name)
      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert({
          business_id: businessId,
          sku_id: sku,
          name,
          category: category || null,
          unit_of_measure: unit || null,
          buying_price: landedCostPerUnit,
          selling_price: parseFloat(sellingPrice),
          vat_type: vatType,
          current_quantity: 0,
        })
        .select()
        .single()

      if (productError) { setError(productError.message); setLoading(false); return }
      productId = newProduct.id
    } else {
      await supabase
        .from("products")
        .update({ buying_price: landedCostPerUnit, selling_price: parseFloat(sellingPrice), vat_type: vatType })
        .eq("id", productId)
    }

    const { error: entryError } = await supabase
      .from("stock_entries")
      .insert({
        business_id: businessId,
        product_id: productId,
        supplier_id: supplierId || null,
        quantity: qty,
        buying_price: unitCost,
        freight_cost: shippingClearing,
        import_duty: importDuty,
        idf,
        rdl,
        vat_on_import: vatOnImport,
        insurance: 0,
        additional_costs: additionalCosts,
        total_cost: totalLandedCost,
        created_by: userId,
      })

    if (entryError) { setError(entryError.message); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
  }

  const resetForm = () => {
    setSuccess(false)
    setComposerStep(1)
    setName(""); setCategory(""); setUnit("")
    setQuantity(""); setTotalPurchaseCost(""); setShippingClearingCost("")
    setAdditionalCosts([]); setSupplierId("")
    setSellingPrice(""); setSelectedProduct(null)
    setVatType("inclusive"); setIsNewProduct(true); setSourcingType("local")
  }

  // ── SUCCESS ──
  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
            <span className="text-emerald-400 text-4xl">✓</span>
          </div>
          <div>
            <h2 className="text-white font-bold text-2xl tracking-tight">Stock received</h2>
            <p className="text-zinc-500 text-sm mt-2">Inventory has been updated successfully</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={resetForm} className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-medium rounded-xl py-3 text-sm transition-colors">
              Add more
            </button>
            <button onClick={() => navigate("/inventory")} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl py-3 text-sm transition-colors">
              View inventory
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppShell
      title="Receive Stock"
      subtitle={`Step ${composerStep} of 4 · Product → Sourcing → Pricing → Review`}
      contentClassName="max-w-6xl"
      right={<UiButton variant="tertiary" size="sm" onClick={() => navigate("/inventory")}>← Back</UiButton>}
    >
      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4">
          {error && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            {[
              { n: 1, label: "Identity" },
              { n: 2, label: "Sourcing" },
              { n: 3, label: "Pricing" },
              { n: 4, label: "Review" },
            ].map((s) => (
              <button
                key={s.n}
                onClick={() => {
                  if (s.n === 1) setComposerStep(1)
                  if (s.n === 2 && canProceedStep1) setComposerStep(2)
                  if (s.n === 3 && canProceedStep1 && canProceedStep2) setComposerStep(3)
                  if (s.n === 4 && canSubmit) setComposerStep(4)
                }}
                className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                  composerStep === s.n
                    ? "bg-emerald-500 text-black"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-500"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {composerStep === 1 && (
            <Section label="01 — Product Identity">
              <UiSectionTitle title="Choose what you are receiving" caption="Create a new product or top up an existing one" />
              <div className="flex gap-2 mb-5">
                <ToggleBtn active={isNewProduct} onClick={() => setIsNewProduct(true)}>New product</ToggleBtn>
                <ToggleBtn active={!isNewProduct} onClick={() => setIsNewProduct(false)}>Existing product</ToggleBtn>
              </div>

              {isNewProduct ? (
                <div className="space-y-4">
                  <Field label="Product name">
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Nike Air Max 90 Black Size 40" />
                    {name && <p className="text-zinc-600 text-xs mt-1.5 font-mono tracking-wide">SKU auto-generated on save</p>}
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Category">
                      <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Sneakers" />
                    </Field>
                    <Field label="Unit">
                      <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="pcs" />
                    </Field>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search products..." />
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {existingProducts
                      .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                      .map(p => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedProduct(p)}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors ${
                            selectedProduct?.id === p.id
                              ? "bg-emerald-500/10 border border-emerald-500/30"
                              : "bg-zinc-900 hover:bg-zinc-800 border border-zinc-800"
                          }`}
                        >
                          <div>
                            <p className="text-white text-sm font-medium">{p.name}</p>
                            <p className="text-zinc-600 text-xs font-mono mt-0.5">{p.sku_id}</p>
                          </div>
                          {selectedProduct?.id === p.id && <span className="text-emerald-400 text-sm">✓</span>}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {composerStep === 2 && (
            <Section label="02 — Sourcing & Cost Build">
              <UiSectionTitle title="Capture intake cost" caption="This sets landed cost before pricing" />
              <div className="flex gap-2 mb-5">
                <ToggleBtn active={sourcingType === "local"} onClick={() => setSourcingType("local")}>Local</ToggleBtn>
                <ToggleBtn active={sourcingType === "import"} onClick={() => setSourcingType("import")}>Import</ToggleBtn>
              </div>

              <div className="space-y-4">
                <Field label="Supplier (optional)">
                  <select
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="">No supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount paid to supplier (KES)">
                    <Input type="number" value={totalPurchaseCost} onChange={e => setTotalPurchaseCost(e.target.value)} placeholder="0.00" />
                  </Field>
                  <Field label="Quantity received">
                    <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" />
                  </Field>
                </div>

                {!!totalPurchaseCost && !!quantity && <StatRow label="Unit cost" value={fmt(unitCost)} accent />}

                <Field label="Transport / shipping cost (KES) — optional">
                  <Input type="number" value={shippingClearingCost} onChange={e => setShippingClearingCost(e.target.value)} placeholder="0.00" />
                </Field>

                {sourcingType === "import" && quantity && totalPurchaseCost && (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2.5">
                    <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-medium mb-3">Import duties — auto-calculated</p>
                    {[
                      { label: "CIF value", value: fmt(cif), muted: true },
                      { label: "Import Duty (25%)", value: fmt(importDuty) },
                      { label: "IDF (3.5%)", value: fmt(idf) },
                      { label: "RDL (2%)", value: fmt(rdl) },
                      { label: "VAT on import (16%)", value: fmt(vatOnImport) },
                      { label: "Total duties", value: fmt(totalDuties), red: true, bold: true },
                    ].map((r, i) => (
                      <div key={i} className={`flex items-center justify-between ${r.bold ? "border-t border-zinc-800 pt-2.5 mt-1" : ""}`}>
                        <p className={`text-xs ${r.muted ? "text-zinc-600" : "text-zinc-400"}`}>{r.label}</p>
                        <p className={`text-xs font-mono ${r.red ? "text-red-400 font-bold" : r.muted ? "text-zinc-500" : "text-zinc-300"}`}>{r.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-medium">Additional costs</p>
                    <button onClick={addCostLine} className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors font-medium">+ Add line</button>
                  </div>
                  {additionalCosts.length > 0 && (
                    <div className="space-y-2">
                      {additionalCosts.map((cost, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={cost.label}
                            onChange={e => updateCostLine(i, "label", e.target.value)}
                            placeholder="Label (e.g. Insurance)"
                            className="flex-1 bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-xs outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
                          />
                          <input
                            type="number"
                            value={cost.amount}
                            onChange={e => updateCostLine(i, "amount", e.target.value)}
                            placeholder="0.00"
                            className="w-28 bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-xs outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
                          />
                          <button onClick={() => removeCostLine(i)} className="text-zinc-700 hover:text-red-400 transition-colors text-sm px-1">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Section>
          )}

          {composerStep === 3 && (
            <Section label="03 — Pricing">
              <UiSectionTitle title="Set selling strategy" caption="Price using landed cost and VAT mode" />
              <div className="space-y-5">
                <StatRow label="Landed cost / unit" value={fmt(landedCostPerUnit)} accent />

                <Field label="VAT on this product">
                  <div className="flex gap-2">
                    {[
                      { value: "none", label: "No VAT" },
                      { value: "inclusive", label: "Inclusive" },
                      { value: "exclusive", label: "Exclusive" },
                    ].map(opt => (
                      <ToggleBtn key={opt.value} active={vatType === opt.value} onClick={() => setVatType(opt.value)}>
                        {opt.label}
                      </ToggleBtn>
                    ))}
                  </div>
                </Field>

                <Field label={`Selling price (KES)${vatType === "inclusive" ? " — VAT included" : vatType === "exclusive" ? " — before VAT" : ""}`}>
                  <Input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} placeholder="0.00" />
                  {landedCostPerUnit > 0 && (
                    <p className="text-zinc-600 text-xs mt-1.5">Suggested range · {fmtShort(suggestedLow)} – {fmtShort(suggestedHigh)}</p>
                  )}
                </Field>

                {sp > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-zinc-400">Profit per unit</p>
                      <p className={`text-sm font-mono font-bold ${profitPerUnit > 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(profitPerUnit)}</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                      <p className="text-sm text-white font-medium">Profit for {qty} units</p>
                      <p className={`text-sm font-mono font-bold ${profitTotal > 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(profitTotal)}</p>
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {composerStep === 4 && (
            <Section label="04 — Review & Confirm">
              <UiSectionTitle title="Final check" caption="Verify values before inventory update" />
              <div className="space-y-2.5">
                <StatRow label="Product" value={isNewProduct ? (name || "-") : (selectedProduct?.name || "-")} />
                <StatRow label="Quantity" value={qty} />
                <StatRow label="Landed cost / unit" value={fmt(landedCostPerUnit)} />
                <StatRow label="Selling price" value={fmt(sp)} />
                <StatRow label="Total landed cost" value={fmt(totalLandedCost)} accent />
              </div>
            </Section>
          )}

          <UiCard className="p-4">
            <div className="flex items-center justify-between gap-2">
              <UiButton
                variant="secondary"
                onClick={() => setComposerStep((s) => Math.max(1, s - 1))}
                disabled={composerStep === 1 || loading}
              >
                Back
              </UiButton>

              {composerStep < 4 && (
                <UiButton
                  variant="primary"
                  onClick={() => setComposerStep((s) => Math.min(4, s + 1))}
                  disabled={
                    (composerStep === 1 && !canProceedStep1) ||
                    (composerStep === 2 && !canProceedStep2) ||
                    (composerStep === 3 && !canProceedStep3)
                  }
                >
                  Continue
                </UiButton>
              )}

              {composerStep === 4 && (
                <UiButton variant="primary" onClick={handleSubmit} disabled={loading || !canSubmit}>
                  {loading ? "Saving..." : "Receive stock"}
                </UiButton>
              )}
            </div>
          </UiCard>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 self-start">
          <UiCard className="p-5 space-y-3">
            <UiSectionTitle title="Live preview" caption="Realtime impact as you type" />
            <StatRow label="Product" value={isNewProduct ? (name || "Draft") : (selectedProduct?.name || "Select product")} />
            <StatRow label="Qty" value={qty || 0} />
            <StatRow label="Unit cost" value={fmt(unitCost)} />
            <StatRow label="Landed / unit" value={fmt(landedCostPerUnit)} accent />
            <StatRow label="Sell price" value={fmt(sp)} />
          </UiCard>

          <UiCard className="p-5 space-y-3">
            <UiSectionTitle title="Confidence checklist" />
            {[
              { ok: canProceedStep1, text: "Product is selected or named" },
              { ok: canProceedStep2, text: "Quantity and purchase cost provided" },
              { ok: canProceedStep3, text: "Selling price set" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <p className={item.ok ? "text-zinc-300" : "text-zinc-600"}>{item.text}</p>
                <span className={item.ok ? "text-emerald-400" : "text-zinc-700"}>{item.ok ? "✓" : "•"}</span>
              </div>
            ))}
          </UiCard>
        </div>
      </div>
    </AppShell>
  )
}

// ── SUB-COMPONENTS ──

function Section({ label, children }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-medium mb-5">{label}</p>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-zinc-400 text-xs mb-2 block">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
    />
  )
}

function ToggleBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors ${
        active ? "bg-emerald-500 text-black" : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  )
}

function StatRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
      <p className="text-zinc-400 text-sm">{label}</p>
      <p className={`text-sm font-mono font-bold ${accent ? "text-emerald-400" : "text-white"}`}>{value}</p>
    </div>
  )
}