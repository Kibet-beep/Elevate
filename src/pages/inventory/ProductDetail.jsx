// src/pages/inventory/ProductDetail.jsx
import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate, useParams } from "react-router-dom"
import { AppShell, UiButton, UiCard, UiSectionTitle } from "../../components/ui"

export default function ProductDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [stockHistory, setStockHistory] = useState([])
  const [salesHistory, setSalesHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [unit, setUnit] = useState("")
  const [sellingPrice, setSellingPrice] = useState("")
  const [buyingPrice, setBuyingPrice] = useState("")
  const [reorderPoint, setReorderPoint] = useState("")

  useEffect(() => {
    fetchProduct()
  }, [id])

  const fetchProduct = async () => {
    const { data } = await supabase
      .from("products")
      .select("*, suppliers(name)")
      .eq("id", id)
      .single()

    setProduct(data)
    setName(data?.name || "")
    setCategory(data?.category || "")
    setUnit(data?.unit_of_measure || "")
    setSellingPrice(data?.selling_price ?? "")
    setBuyingPrice(data?.buying_price ?? "")
    setReorderPoint(data?.reorder_point ?? "")

    const { data: history } = await supabase
      .from("stock_entries")
      .select("*")
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(10)

    setStockHistory(history || [])

    const { data: sales } = await supabase
      .from("sale_items")
      .select("quantity, total_amount, unit_price, transactions(date, payment_account)")
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(50)

    setSalesHistory(sales || [])
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")

    const { error } = await supabase
      .from("products")
      .update({
        name,
        category: category || null,
        unit_of_measure: unit || null,
        selling_price: parseFloat(sellingPrice),
        buying_price: parseFloat(buyingPrice),
        reorder_point: parseInt(reorderPoint),
      })
      .eq("id", id)

    if (error) {
      setError(error.message)
    } else {
      setEditing(false)
      fetchProduct()
    }
    setSaving(false)
  }

  const handleDeactivate = async () => {
    if (!confirm("Remove this product from inventory?")) return
    await supabase.from("products").update({ is_active: false }).eq("id", id)
    navigate("/inventory")
  }

  const fmt = (n) => `KES ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
  const isLowStock = product && product.current_quantity <= product.reorder_point
  const selling = Number(product?.selling_price || 0)
  const buying = Number(product?.buying_price || 0)
  const marginPerUnit = selling - buying
  const marginPct = selling > 0 ? (marginPerUnit / selling) * 100 : 0
  const stockValue = Number(product?.current_quantity || 0) * buying

  const accountLabel = (acc) => {
    if (acc === "mpesa") return "M-Pesa"
    return acc ? acc.charAt(0).toUpperCase() + acc.slice(1) : "-"
  }

  const goToSalesReport = (date) => {
    const d = new Date(date)
    const dateStr = d.toISOString().split("T")[0]
    navigate(`/settings/sales-report?date=${dateStr}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <AppShell
      title={product?.name || "Product"}
      subtitle={product?.sku_id || ""}
      contentClassName="max-w-6xl"
      right={(
        <>
          <UiButton variant="secondary" size="sm" onClick={() => navigate("/inventory")}>← Back</UiButton>
          <UiButton variant={editing ? "ghost" : "secondary"} size="sm" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Edit"}
          </UiButton>
        </>
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          {error && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* ── Hero card ── */}
          <UiCard className="p-5 overflow-hidden relative">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-sky-400 to-emerald-400" />
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${isLowStock ? "bg-red-400/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                    {isLowStock ? "Low stock" : "Healthy"}
                  </span>
                  <span className="text-[10px] px-2 py-1 rounded-full font-medium bg-zinc-800 text-zinc-400">
                    {product?.unit_of_measure || "units"}
                  </span>
                </div>
                <div>
                  <h2 className="text-white text-2xl lg:text-3xl font-bold tracking-tight">{product?.name}</h2>
                  <p className="text-zinc-500 text-xs mt-1 font-mono">SKU {product?.sku_id}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <UiButton variant="primary" onClick={() => navigate("/inventory/new-stock")}>+ Receive stock</UiButton>
                <UiButton variant="secondary" onClick={() => setEditing((v) => !v)}>{editing ? "View mode" : "Quick edit"}</UiButton>
              </div>
            </div>

            <div className="grid gap-3 mt-5 sm:grid-cols-3">
              <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4">
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2">In stock</p>
                <p className={`text-xl font-bold font-mono ${isLowStock ? "text-red-400" : "text-emerald-400"}`}>
                  {product?.current_quantity} {product?.unit_of_measure || "units"}
                </p>
              </div>
              <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4">
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2">Stock value</p>
                <p className="text-xl font-bold font-mono text-white">{fmt(stockValue)}</p>
              </div>
              <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4">
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2">Margin</p>
                <p className={`text-xl font-bold font-mono ${marginPerUnit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmt(marginPerUnit)}
                </p>
                <p className="text-zinc-600 text-xs mt-1">{marginPct.toFixed(1)}% per unit</p>
              </div>
            </div>

            {isLowStock && (
              <div className="mt-4 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm font-medium">Low stock warning</p>
                <p className="text-zinc-400 text-xs mt-0.5">
                  Current quantity ({product?.current_quantity}) is at or below reorder point ({product?.reorder_point})
                </p>
              </div>
            )}
          </UiCard>

          {/* ── Sales history ── */}
          <UiCard className="p-5">
            <UiSectionTitle title="Sales history" caption="Every unit sold — click any row to see full day context" />
            {salesHistory.length === 0 ? (
              <p className="text-zinc-600 text-sm text-center py-8">No sales recorded for this product yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left text-[10px] uppercase tracking-widest text-zinc-600 font-medium px-0 py-3">Date</th>
                      <th className="text-left text-[10px] uppercase tracking-widest text-zinc-600 font-medium px-4 py-3">Time</th>
                      <th className="text-right text-[10px] uppercase tracking-widest text-zinc-600 font-medium px-4 py-3">Qty</th>
                      <th className="text-right text-[10px] uppercase tracking-widest text-zinc-600 font-medium px-4 py-3">Unit price</th>
                      <th className="text-right text-[10px] uppercase tracking-widest text-zinc-600 font-medium px-4 py-3">Total</th>
                      <th className="text-right text-[10px] uppercase tracking-widest text-zinc-600 font-medium px-0 py-3">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesHistory.map((sale, i) => {
                      const date = sale.transactions?.date
                      return (
                        <tr
                          key={i}
                          onClick={() => goToSalesReport(date)}
                          className="border-b border-zinc-900 hover:bg-zinc-800/40 cursor-pointer transition-colors"
                        >
                          <td className="py-3 pr-4 text-xs text-zinc-400 whitespace-nowrap">
                            {new Date(date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="py-3 px-4 text-xs text-zinc-500 font-mono whitespace-nowrap">
                            {new Date(date).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-3 px-4 text-xs text-right font-mono text-zinc-300">{sale.quantity}</td>
                          <td className="py-3 px-4 text-xs text-right font-mono text-zinc-300">{fmt(sale.unit_price)}</td>
                          <td className="py-3 px-4 text-xs text-right font-mono text-emerald-400 font-medium">{fmt(sale.total_amount)}</td>
                          <td className="py-3 pl-4 text-xs text-right text-zinc-400 capitalize">{accountLabel(sale.transactions?.payment_account)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-zinc-700">
                      <td colSpan={4} className="py-3 text-xs text-zinc-500">
                        {salesHistory.length} transaction{salesHistory.length !== 1 ? "s" : ""}
                      </td>
                      <td className="py-3 px-4 text-xs text-right font-mono text-emerald-400 font-bold">
                        {fmt(salesHistory.reduce((s, i) => s + i.total_amount, 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </UiCard>

          {/* ── Stock movement timeline ── */}
          <UiCard className="p-5">
            <UiSectionTitle title="Stock movement timeline" caption="Recent receipts for this product" />
            {stockHistory.length === 0 ? (
              <p className="text-zinc-600 text-sm text-center py-8">No stock entries yet</p>
            ) : (
              <div className="space-y-3">
                {stockHistory.map((entry, i) => (
                  <div key={i} className="flex items-start justify-between gap-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 px-4 py-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <span className="text-emerald-400 text-sm">+</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium">{entry.quantity} units received</p>
                        <p className="text-zinc-500 text-xs mt-0.5">{new Date(entry.created_at).toLocaleDateString("en-KE")}</p>
                      </div>
                    </div>
                    <p className="text-zinc-300 text-sm font-mono whitespace-nowrap">{fmt(entry.total_cost)}</p>
                  </div>
                ))}
              </div>
            )}
          </UiCard>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4 lg:sticky lg:top-6 self-start">
          <UiCard className="p-5">
            <UiSectionTitle title="Product details" caption="Core identity and supply context" />
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Product name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 text-xs mb-1 block">Category</label>
                    <input type="text" value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors" />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs mb-1 block">Unit</label>
                    <input type="text" value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 text-xs mb-1 block">Selling price</label>
                    <input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors" />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs mb-1 block">Buying price</label>
                    <input type="number" value={buyingPrice} onChange={e => setBuyingPrice(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Reorder point</label>
                  <input type="number" value={reorderPoint} onChange={e => setReorderPoint(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors" />
                </div>
                <UiButton variant="primary" className="w-full" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </UiButton>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: "Category", value: product?.category || "—" },
                  { label: "Unit of measure", value: product?.unit_of_measure || "—" },
                  { label: "Reorder point", value: product?.reorder_point },
                  { label: "Supplier", value: product?.suppliers?.name || "—" },
                  { label: "Added on", value: new Date(product?.created_at).toLocaleDateString("en-KE") },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 border-b border-zinc-800 last:border-0 pb-2 last:pb-0">
                    <p className="text-zinc-500 text-sm">{r.label}</p>
                    <p className="text-sm text-white text-right">{r.value}</p>
                  </div>
                ))}
              </div>
            )}
          </UiCard>

          <UiCard className="p-5">
            <UiSectionTitle title="Pricing lens" caption="Quick glance at profitability" />
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-zinc-500 text-sm">Selling price</p>
                <p className="text-white text-sm font-mono">{fmt(product?.selling_price)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-zinc-500 text-sm">Buying price</p>
                <p className="text-zinc-300 text-sm font-mono">{fmt(product?.buying_price)}</p>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-800 pt-2.5">
                <p className="text-zinc-500 text-sm">Margin / unit</p>
                <p className={`text-sm font-mono font-bold ${marginPerUnit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmt(marginPerUnit)}
                </p>
              </div>
            </div>
          </UiCard>

          <UiCard className="p-5">
            <UiSectionTitle title="Danger zone" />
            <UiButton variant="secondary" className="w-full border-red-400/20 text-red-400 hover:border-red-400/40" onClick={handleDeactivate}>
              Remove from inventory
            </UiButton>
          </UiCard>
        </div>
      </div>

      <div className="md:hidden fixed bottom-24 left-4 right-4 z-30 grid grid-cols-2 gap-2">
        <UiButton variant="secondary" onClick={() => navigate("/inventory/new-stock")}>+ Receive stock</UiButton>
        <UiButton variant="primary" onClick={() => setEditing((v) => !v)}>{editing ? "View" : "Edit"}</UiButton>
      </div>
    </AppShell>
  )
}