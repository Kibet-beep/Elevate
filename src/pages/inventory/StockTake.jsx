// src/pages/inventory/StockTake.jsx
import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"

function classifyABC(products) {
  if (!products.length) return {}
  const sorted = [...products]
    .map((p) => ({ id: p.id, value: (p.current_quantity || 0) * (p.buying_price || 0) }))
    .sort((a, b) => b.value - a.value)
  const total = sorted.length
  const result = {}
  sorted.forEach((p, i) => {
    const pct = (i + 1) / total
    result[p.id] = pct <= 0.2 ? "A" : pct <= 0.7 ? "B" : "C"
  })
  return result
}

const fmt = (n) => `KES ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 0 })}`

// ── SUB-COMPONENTS (matching NewStock aesthetic) ──

function Section({ label, children }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
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

function Input({ value, onChange, placeholder, type = "text", min }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
    />
  )
}

function ToggleBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors ${
        active
          ? "bg-emerald-500 text-black"
          : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  )
}

function StatPill({ label, value, accent, red, amber, blue, purple }) {
  const color = accent
    ? "text-emerald-400"
    : red
    ? "text-red-400"
    : amber
    ? "text-amber-400"
    : blue
    ? "text-blue-400"
    : purple
    ? "text-purple-400"
    : "text-white"
  return (
    <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
      <p className="text-zinc-400 text-sm">{label}</p>
      <p className={`text-sm font-mono font-bold ${color}`}>{value}</p>
    </div>
  )
}

function ABCBadge({ cls }) {
  const style =
    cls === "A"
      ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
      : cls === "B"
      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
      : "bg-zinc-800 text-zinc-500 border-zinc-700"
  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${style}`}>{cls}</span>
  )
}

function StatusBadge({ status }) {
  const style =
    status === "approved"
      ? "bg-emerald-500/10 text-emerald-400"
      : status === "counting"
      ? "bg-amber-400/10 text-amber-400"
      : "bg-zinc-800 text-zinc-400"
  return (
    <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full capitalize ${style}`}>
      {status}
    </span>
  )
}

function ErrorBanner({ msg }) {
  if (!msg) return null
  return (
    <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
      <p className="text-red-400 text-sm">{msg}</p>
    </div>
  )
}

function PrimaryBtn({ onClick, disabled, loading, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-semibold rounded-xl py-4 text-sm transition-colors tracking-wide"
    >
      {loading ? "Please wait..." : children}
    </button>
  )
}

// ── MAIN COMPONENT ──

export default function StockTake() {
  const navigate = useNavigate()
  const [businessId, setBusinessId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [allProducts, setAllProducts] = useState([])
  const [products, setProducts] = useState([])
  const [abcMap, setAbcMap] = useState({})
  const [counts, setCounts] = useState({})
  const [causes, setCauses] = useState({})
  const [step, setStep] = useState("setup") // setup | brief | counting | review | done
  const [stockTakeId, setStockTakeId] = useState(null)
  const [type, setType] = useState("full")
  const [spotSearch, setSpotSearch] = useState("")
  const [spotSelected, setSpotSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [pastStockTakes, setPastStockTakes] = useState([])
  const [selectedVarianceId, setSelectedVarianceId] = useState(null)

  useEffect(() => { fetchInitialData() }, [])

  const fetchInitialData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase.from("users").select("business_id").eq("id", user.id).single()
    setBusinessId(userData.business_id)
    setUserId(user.id)

    const { data: productsData } = await supabase
      .from("products")
      .select("id, name, sku_id, current_quantity, unit_of_measure, category, buying_price")
      .eq("business_id", userData.business_id)
      .eq("is_active", true)
      .order("name")

    const prods = productsData || []
    setAllProducts(prods)
    setAbcMap(classifyABC(prods))

    const { data: past } = await supabase
      .from("stock_takes")
      .select("*")
      .eq("business_id", userData.business_id)
      .order("created_at", { ascending: false })
      .limit(5)

    setPastStockTakes(past || [])
  }

  const getProductsForType = (t, spotId = null) => {
    if (t === "full") return allProducts
    if (t === "cycle_count") return allProducts.filter((p) => ["A", "B"].includes(abcMap[p.id]))
    if (t === "spot_check") return spotId ? allProducts.filter((p) => p.id === spotId) : []
    return allProducts
  }

  const variance = (productId, expectedQty) => {
    const actual = parseFloat(counts[productId] ?? expectedQty)
    return actual - expectedQty
  }

  const totalKesVariance = () =>
    products.reduce((sum, p) => sum + variance(p.id, p.current_quantity) * (p.buying_price || 0), 0)

  const proceedToBrief = () => {
    const filtered = getProductsForType(type, spotSelected?.id)
    if (type === "spot_check" && !spotSelected) { setError("Select a product for spot check"); return }
    setProducts(filtered)
    const initCounts = {}
    const initCauses = {}
    filtered.forEach((p) => { initCounts[p.id] = p.current_quantity; initCauses[p.id] = "none" })
    setCounts(initCounts)
    setCauses(initCauses)
    setError("")
    setStep("brief")
  }

  const startCount = async () => {
    setLoading(true)
    setError("")
    const { data, error } = await supabase
      .from("stock_takes")
      .insert({ business_id: businessId, type, start_date: new Date().toISOString(), status: "counting", counted_by: userId })
      .select()
      .single()
    if (error) { setError(error.message); setLoading(false); return }
    setStockTakeId(data.id)
    setStep("counting")
    setLoading(false)
  }

  const submitCounts = async () => {
    setLoading(true)
    setError("")
    const items = products.map((p) => ({
      stock_take_id: stockTakeId,
      product_id: p.id,
      expected_quantity: p.current_quantity,
      actual_quantity: parseFloat(counts[p.id] ?? p.current_quantity),
    }))
    const { error: itemsError } = await supabase.from("stock_take_items").insert(items)
    if (itemsError) { setError(itemsError.message); setLoading(false); return }
    await supabase.from("stock_takes").update({ status: "variance_review" }).eq("id", stockTakeId)
    setStep("review")
    setLoading(false)
  }

  const approveStockTake = async () => {
    setLoading(true)
    setError("")
    const { error } = await supabase
      .from("stock_takes")
      .update({ status: "approved", approved_by: userId, end_date: new Date().toISOString() })
      .eq("id", stockTakeId)
    if (error) { setError(error.message); setLoading(false); return }
    setStep("done")
    setLoading(false)
  }

  // ── STEP 1: SETUP ──
  if (step === "setup") {
    const typeOptions = [
      { value: "full", label: "Full count", desc: `Count all ${allProducts.length} products`, count: allProducts.length },
      { value: "cycle_count", label: "Cycle count", desc: "A and B class products only", count: allProducts.filter((p) => ["A", "B"].includes(abcMap[p.id])).length },
      { value: "spot_check", label: "Spot check", desc: "One specific product", count: 1 },
    ]

    return (
      <div className="min-h-screen bg-zinc-950 pb-16">
        {/* Header */}
        <div className="px-5 pt-8 pb-6">
          <button onClick={() => navigate("/inventory")} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm mb-6">
            ← Back
          </button>
          <h1 className="text-white font-bold text-2xl tracking-tight">Stock Take</h1>
          <p className="text-zinc-500 text-sm mt-1">Choose the type of count to run</p>
        </div>

        <div className="px-5 max-w-2xl mx-auto space-y-4">
          <ErrorBanner msg={error} />

          {/* 01 — Count type */}
          <Section label="01 — Count Type">
            <div className="flex gap-2 mb-1">
              {typeOptions.map((t) => (
                <ToggleBtn key={t.value} active={type === t.value} onClick={() => { setType(t.value); setSpotSelected(null); setSpotSearch("") }}>
                  {t.label}
                </ToggleBtn>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {typeOptions.map((t) => (
                <div
                  key={t.value}
                  onClick={() => { setType(t.value); setSpotSelected(null); setSpotSearch("") }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors border ${
                    type === t.value
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div>
                    <p className={`text-sm font-medium ${type === t.value ? "text-emerald-400" : "text-white"}`}>{t.label}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{t.desc}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-2.5 py-1 rounded-full">
                      {t.count} {t.count === 1 ? "product" : "products"}
                    </span>
                    {type === t.value && <span className="text-emerald-400 text-sm">✓</span>}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Spot check product picker */}
          {type === "spot_check" && (
            <Section label="02 — Select Product">
              <Input
                value={spotSearch}
                onChange={(e) => setSpotSearch(e.target.value)}
                placeholder="Search by name or SKU..."
              />
              {spotSearch && (
                <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
                  {allProducts
                    .filter((p) =>
                      p.name.toLowerCase().includes(spotSearch.toLowerCase()) ||
                      p.sku_id.toLowerCase().includes(spotSearch.toLowerCase())
                    )
                    .map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSpotSelected(p)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors border ${
                          spotSelected?.id === p.id
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        <div>
                          <p className="text-white text-sm font-medium">{p.name}</p>
                          <p className="text-zinc-600 text-xs font-mono mt-0.5">{p.sku_id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ABCBadge cls={abcMap[p.id] || "C"} />
                          {spotSelected?.id === p.id && <span className="text-emerald-400 text-sm">✓</span>}
                        </div>
                      </div>
                    ))}
                </div>
              )}
              {spotSelected && (
                <div className="mt-3 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                  <p className="text-emerald-400 text-sm font-medium">{spotSelected.name}</p>
                  <button onClick={() => setSpotSelected(null)} className="text-zinc-500 hover:text-red-400 transition-colors text-sm">✕</button>
                </div>
              )}
            </Section>
          )}

          {/* Past stock takes */}
          {pastStockTakes.length > 0 && (
            <Section label={type === "spot_check" ? "03 — Recent Stock Takes" : "02 — Recent Stock Takes"}>
              <div className="space-y-3">
                {pastStockTakes.map((st, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-white text-sm font-medium capitalize">{st.type.replace("_", " ")}</p>
                      <p className="text-zinc-600 text-xs mt-0.5">{new Date(st.created_at).toLocaleDateString("en-KE")}</p>
                    </div>
                    <StatusBadge status={st.status} />
                  </div>
                ))}
              </div>
            </Section>
          )}

          <PrimaryBtn onClick={proceedToBrief} loading={false}>Continue →</PrimaryBtn>
          <div className="h-4" />
        </div>
      </div>
    )
  }

  // ── STEP 2: BRIEF ──
  if (step === "brief") {
    const systemValue = products.reduce((s, p) => s + p.current_quantity * (p.buying_price || 0), 0)
    const aCount = products.filter((p) => abcMap[p.id] === "A").length
    const bCount = products.filter((p) => abcMap[p.id] === "B").length
    const cCount = products.filter((p) => abcMap[p.id] === "C").length
    const typeLabel = type === "full" ? "Full Count" : type === "cycle_count" ? "Cycle Count" : "Spot Check"

    return (
      <div className="min-h-screen bg-zinc-950 pb-16">
        <div className="px-5 pt-8 pb-6">
          <button onClick={() => setStep("setup")} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm mb-6">
            ← Back
          </button>
          <h1 className="text-white font-bold text-2xl tracking-tight">{typeLabel}</h1>
          <p className="text-zinc-500 text-sm mt-1">{products.length} product{products.length !== 1 ? "s" : ""} to count</p>
        </div>

        <div className="px-5 max-w-2xl mx-auto space-y-4">

          {/* 01 — System snapshot */}
          <Section label="01 — System Snapshot · Frozen at Start">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500 opacity-70" />
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-medium mb-2">Products</p>
                <p className="text-emerald-400 text-2xl font-mono font-bold">{products.length}</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-400 opacity-70" />
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-medium mb-2">Stock Value</p>
                <p className="text-blue-400 text-sm font-mono font-bold leading-tight">{fmt(systemValue)}</p>
              </div>
            </div>

            {/* ABC breakdown */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "A Class", count: aCount, cls: "A" },
                { label: "B Class", count: bCount, cls: "B" },
                { label: "C Class", count: cCount, cls: "C" },
              ].map((row) => (
                <div key={row.cls} className={`rounded-xl p-3 text-center border ${
                  row.cls === "A" ? "bg-purple-500/10 border-purple-500/20" :
                  row.cls === "B" ? "bg-blue-500/10 border-blue-500/20" :
                  "bg-zinc-800/50 border-zinc-700"
                }`}>
                  <p className={`text-lg font-mono font-bold ${
                    row.cls === "A" ? "text-purple-400" : row.cls === "B" ? "text-blue-400" : "text-zinc-500"
                  }`}>{row.count}</p>
                  <p className={`text-[10px] mt-0.5 ${
                    row.cls === "A" ? "text-purple-400/70" : row.cls === "B" ? "text-blue-400/70" : "text-zinc-600"
                  }`}>{row.label}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* 02 — Instructions */}
          <Section label="02 — Before You Start">
            <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-4 space-y-3">
              {[
                "Count what is physically on your shelf — do not rely on the system numbers",
                "System quantities are hidden during counting to avoid bias",
                "Enter each product's actual physical count as you find it",
                "Any difference will be flagged for your review before anything is updated",
              ].map((note, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-amber-400 text-xs mt-0.5 shrink-0">•</span>
                  <p className="text-zinc-300 text-sm leading-relaxed">{note}</p>
                </div>
              ))}
            </div>
          </Section>

          <PrimaryBtn onClick={startCount} loading={loading}>Start counting →</PrimaryBtn>
          <div className="h-4" />
        </div>
      </div>
    )
  }

  // ── STEP 3: COUNTING ──
  if (step === "counting") {
    const countedWithVariance = products.filter((p) => {
      const v = variance(p.id, p.current_quantity)
      return v !== 0
    }).length

    return (
      <div className="min-h-screen bg-zinc-950 pb-28">
        {/* Header */}
        <div className="px-5 pt-8 pb-5 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-white font-bold text-2xl tracking-tight">Counting</h1>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-400">
              In progress
            </span>
          </div>
          <p className="text-zinc-500 text-sm">{type.replace("_", " ")} · {products.length} products</p>

          {/* Progress strip */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatPill label="Total" value={products.length} />
            <StatPill label="Variances" value={countedWithVariance} amber={countedWithVariance > 0} accent={countedWithVariance === 0} />
            <StatPill label="KES impact" value={fmt(Math.abs(totalKesVariance()))} red={totalKesVariance() < 0} accent={totalKesVariance() >= 0 && countedWithVariance > 0} />
          </div>
        </div>

        <div className="px-5 max-w-2xl mx-auto">
          <p className="text-zinc-600 text-xs mt-4 mb-3">
            System quantities hidden — enter what you physically see on the shelf.
          </p>

          <ErrorBanner msg={error} />

          <div className="mt-3 space-y-3">
            {products.map((p) => {
              const actual = parseFloat(counts[p.id] ?? p.current_quantity)
              const v = actual - p.current_quantity
              const kesVariance = v * (p.buying_price || 0)
              const hasVariance = !isNaN(v) && v !== 0
              const abc = abcMap[p.id] || "C"

              return (
                <div
                  key={p.id}
                  className={`bg-zinc-900 rounded-2xl p-4 border transition-colors ${
                    hasVariance
                      ? v < 0
                        ? "border-red-400/30"
                        : "border-emerald-500/30"
                      : "border-zinc-800"
                  }`}
                >
                  {/* Product header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-white text-sm font-medium">{p.name}</p>
                        <ABCBadge cls={abc} />
                      </div>
                      <p className="text-zinc-600 text-xs font-mono">{p.sku_id}</p>
                    </div>

                    {hasVariance && (
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-mono font-bold ${v > 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {v > 0 ? "+" : ""}{v} units
                        </p>
                        <p className={`text-xs font-mono mt-0.5 opacity-80 ${v > 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {v > 0 ? "+" : ""}{fmt(Math.abs(kesVariance))}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Inputs */}
                  <div className={`grid gap-3 ${hasVariance ? "grid-cols-2" : "grid-cols-1"}`}>
                    <div>
                      <label className="text-zinc-500 text-[10px] uppercase tracking-widest font-medium block mb-1.5">
                        Physical count
                      </label>
                      <input
                        type="number"
                        value={counts[p.id] ?? p.current_quantity}
                        onChange={(e) => setCounts({ ...counts, [p.id]: e.target.value })}
                        min="0"
                        className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>

                    {hasVariance && (
                      <div>
                        <label className="text-zinc-500 text-[10px] uppercase tracking-widest font-medium block mb-1.5">
                          Cause
                        </label>
                        <select
                          value={causes[p.id] || "none"}
                          onChange={(e) => setCauses({ ...causes, [p.id]: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors"
                        >
                          <option value="none">Select cause</option>
                          <option value="theft">Theft / loss</option>
                          <option value="damage">Damage</option>
                          <option value="error">Data entry error</option>
                          <option value="unrecorded">Unrecorded receipt</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Fixed bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 px-5 py-4">
          <PrimaryBtn onClick={submitCounts} loading={loading}>Submit counts →</PrimaryBtn>
        </div>
      </div>
    )
  }

  // ── STEP 4: REVIEW ──
  if (step === "review") {
    const variances = products.filter((p) => {
      const actual = parseFloat(counts[p.id] ?? p.current_quantity)
      return actual !== p.current_quantity
    })
    const totalKes = totalKesVariance()
    const selectedVariance = variances.find((p) => p.id === selectedVarianceId) || null

    return (
      <div className="min-h-screen bg-zinc-950 pb-28">
        <div className="px-5 pt-8 pb-6">
          <h1 className="text-white font-bold text-2xl tracking-tight">Variance Review</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {variances.length} item{variances.length !== 1 ? "s" : ""} with variance · review before approving
          </p>
        </div>

        <div className="px-5 max-w-2xl mx-auto space-y-4">
          <ErrorBanner msg={error} />

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Counted", value: products.length, color: "text-white" },
              { label: "Variances", value: variances.length, color: variances.length > 0 ? "text-amber-400" : "text-emerald-400" },
              { label: "KES impact", value: fmt(Math.abs(totalKes)), color: totalKes < 0 ? "text-red-400" : totalKes > 0 ? "text-emerald-400" : "text-zinc-500", small: true },
            ].map((card, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-0.5 opacity-70 ${
                  i === 0 ? "bg-zinc-500" : i === 1 && variances.length > 0 ? "bg-amber-400" : i === 1 ? "bg-emerald-500" : totalKes < 0 ? "bg-red-400" : "bg-emerald-500"
                }`} />
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-medium mb-2">{card.label}</p>
                <p className={`font-mono font-bold ${card.color} ${card.small ? "text-xs leading-tight" : "text-2xl"}`}>{card.value}</p>
                {i === 2 && totalKes !== 0 && (
                  <p className="text-zinc-600 text-[10px] mt-1">{totalKes < 0 ? "loss" : "gain"}</p>
                )}
              </div>
            ))}
          </div>

          {/* 01 — Variance detail */}
          <Section label="01 — Variance Detail">
            {variances.length === 0 ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
                <p className="text-emerald-400 text-base font-semibold">Perfect count</p>
                <p className="text-zinc-400 text-sm mt-1">All quantities match the system</p>
              </div>
            ) : (
              <>
                <div className="md:hidden space-y-2">
                  {variances.map((p) => {
                    const actual = parseFloat(counts[p.id] ?? p.current_quantity)
                    const v = actual - p.current_quantity
                    const abc = abcMap[p.id] || "C"

                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedVarianceId(p.id)}
                        className={`w-full text-left bg-zinc-950 border rounded-xl px-4 py-3 ${
                          v < 0 ? "border-red-400/20" : "border-emerald-500/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="text-white text-sm font-medium truncate">{p.name}</p>
                              <ABCBadge cls={abc} />
                            </div>
                            <p className="text-zinc-600 text-xs font-mono">{p.sku_id}</p>
                          </div>
                          <p className={`text-sm font-mono font-bold whitespace-nowrap ${v > 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {v > 0 ? "+" : ""}{v}
                          </p>
                        </div>
                        <p className="text-zinc-600 text-xs mt-2">System {p.current_quantity} → Actual {actual}</p>
                      </button>
                    )
                  })}
                </div>

                <div className="hidden md:block bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px]">
                      <thead className="sticky top-0 bg-zinc-950 z-10">
                        <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                          <th className="py-3 px-4 font-medium">SKU</th>
                          <th className="py-3 px-4 font-medium">Product</th>
                          <th className="py-3 px-4 font-medium">Class</th>
                          <th className="py-3 px-4 font-medium text-right">System</th>
                          <th className="py-3 px-4 font-medium text-right">Actual</th>
                          <th className="py-3 px-4 font-medium text-right">Variance</th>
                          <th className="py-3 px-4 font-medium text-right">KES Impact</th>
                          <th className="py-3 px-4 font-medium">Cause</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variances.map((p) => {
                          const actual = parseFloat(counts[p.id] ?? p.current_quantity)
                          const v = actual - p.current_quantity
                          const kesV = v * (p.buying_price || 0)
                          const abc = abcMap[p.id] || "C"

                          return (
                            <tr key={p.id} className="border-b border-zinc-900 hover:bg-zinc-900/50">
                              <td className="py-3 px-4 text-[11px] text-zinc-500 font-mono">{p.sku_id}</td>
                              <td className="py-3 px-4 text-sm text-white font-medium">{p.name}</td>
                              <td className="py-3 px-4"><ABCBadge cls={abc} /></td>
                              <td className="py-3 px-4 text-xs text-right font-mono text-zinc-400">{p.current_quantity}</td>
                              <td className="py-3 px-4 text-xs text-right font-mono text-zinc-200">{actual}</td>
                              <td className={`py-3 px-4 text-xs text-right font-mono font-semibold ${v > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {v > 0 ? "+" : ""}{v}
                              </td>
                              <td className={`py-3 px-4 text-xs text-right font-mono ${v > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {v > 0 ? "+" : "-"}{fmt(Math.abs(kesV))}
                              </td>
                              <td className="py-3 px-4 text-xs text-zinc-500 capitalize">{causes[p.id] && causes[p.id] !== "none" ? causes[p.id].replace("_", " ") : "-"}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </Section>

          {/* 02 — Warning */}
          <Section label="02 — Confirmation">
            <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-3">
              <p className="text-zinc-300 text-sm leading-relaxed">
                Approving will update all inventory quantities to match your physical count. <span className="text-amber-400 font-medium">This cannot be undone.</span>
              </p>
            </div>
          </Section>
        </div>

        {/* Fixed bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 px-5 py-4">
          <PrimaryBtn onClick={approveStockTake} loading={loading}>Approve & update inventory →</PrimaryBtn>
        </div>

        {selectedVariance && (
          <div className="md:hidden fixed inset-0 z-[60] bg-black/60" onClick={() => setSelectedVarianceId(null)}>
            <div
              className="absolute bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
              <p className="text-white text-base font-semibold">{selectedVariance.name}</p>
              <p className="text-zinc-500 text-xs mt-1 font-mono">{selectedVariance.sku_id}</p>

              {(() => {
                const actual = parseFloat(counts[selectedVariance.id] ?? selectedVariance.current_quantity)
                const v = actual - selectedVariance.current_quantity
                const kesV = v * (selectedVariance.buying_price || 0)
                const abc = abcMap[selectedVariance.id] || "C"

                return (
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-zinc-500">Class</p>
                      <ABCBadge cls={abc} />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-zinc-500">System qty</p>
                      <p className="text-zinc-300 font-mono">{selectedVariance.current_quantity}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-zinc-500">Actual qty</p>
                      <p className="text-zinc-200 font-mono">{actual}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-zinc-500">Variance</p>
                      <p className={`font-mono font-semibold ${v > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {v > 0 ? "+" : ""}{v}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-zinc-500">KES impact</p>
                      <p className={`font-mono ${v > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {v > 0 ? "+" : "-"}{fmt(Math.abs(kesV))}
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                      <p className="text-zinc-500">Cause</p>
                      <p className="text-zinc-300 capitalize">{causes[selectedVariance.id] && causes[selectedVariance.id] !== "none" ? causes[selectedVariance.id].replace("_", " ") : "-"}</p>
                    </div>
                  </div>
                )
              })()}

              <button
                onClick={() => setSelectedVarianceId(null)}
                className="mt-5 w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl py-3 text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── STEP 5: DONE ──
  if (step === "done") {
    const variances = products.filter((p) => {
      const actual = parseFloat(counts[p.id] ?? p.current_quantity)
      return actual !== p.current_quantity
    })

    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-5">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
            <span className="text-emerald-400 text-4xl">✓</span>
          </div>
          <div>
            <h2 className="text-white font-bold text-2xl tracking-tight">Stock take complete</h2>
            <p className="text-zinc-500 text-sm mt-2">
              {variances.length === 0
                ? "All quantities matched — no adjustments needed"
                : `${variances.length} item${variances.length !== 1 ? "s" : ""} adjusted to match physical count`}
            </p>
          </div>

          {/* Summary pills */}
          {variances.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left space-y-2">
              <StatPill label="Items adjusted" value={variances.length} accent />
              <StatPill label="KES impact" value={fmt(Math.abs(totalKesVariance()))} red={totalKesVariance() < 0} accent={totalKesVariance() >= 0} />
            </div>
          )}

          <button
            onClick={() => navigate("/inventory")}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl py-4 text-sm transition-colors tracking-wide"
          >
            Back to inventory
          </button>
        </div>
      </div>
    )
  }
}