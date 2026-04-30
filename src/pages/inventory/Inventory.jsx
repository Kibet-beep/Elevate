// src/pages/inventory/Inventory.jsx
import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import FloatingBottomNav from "../../components/layout/FloatingBottomNav"
import { useUser, useIsOwner, useIsOwnerOrManager } from "../../hooks/useRole"

export default function Inventory() {
  const navigate = useNavigate()
  const { user: authUser } = useUser()
  const isOwner = useIsOwner()
  const isOwnerOrManager = useIsOwnerOrManager()
  const [businessId, setBusinessId] = useState(null)
  const [products, setProducts] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [riskFilter, setRiskFilter] = useState("all")
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [authUser])

  useEffect(() => {
    let result = products
    if (search) {
      result = result.filter(p =>
        (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.sku_id || "").toLowerCase().includes(search.toLowerCase())
      )
    }
    if (categoryFilter !== "all") {
      result = result.filter((p) => p.category === categoryFilter)
    }

    if (riskFilter === "low") {
      result = result.filter((p) => isLowStock(p))
    }

    if (riskFilter === "healthy") {
      result = result.filter((p) => !isLowStock(p))
    }

    if (riskFilter === "out") {
      result = result.filter((p) => Number(p.current_quantity || 0) === 0)
    }

    setFiltered(result)
  }, [search, categoryFilter, riskFilter, products])

  const fetchProducts = async () => {
    if (!authUser) {
      setLoading(false)
      return
    }

    const { data: userData } = await supabase
      .from("users")
      .select("business_id")
      .eq("id", authUser.id)
      .single()

    if (!userData?.business_id) {
      setProducts([])
      setFiltered([])
      setCategories([])
      setLoading(false)
      return
    }

    setBusinessId(userData.business_id)

    const { data } = await supabase
      .from("products")
      .select("id, name, sku_id, category, current_quantity, reorder_point, buying_price, selling_price, unit_of_measure")
      .eq("business_id", userData.business_id)
      .order("name")

    setProducts(data || [])
    setFiltered(data || [])

    const cats = [...new Set((data || []).map((p) => p.category).filter(Boolean))]
    setCategories(cats)
    setLoading(false)
  }

  const isLowStock = (p) => Number(p.current_quantity || 0) <= Number(p.reorder_point || 0)

  const fmt = (n) => `KES ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`

  const totalUnits = products.reduce((sum, p) => sum + Number(p.current_quantity || 0), 0)
  const activeProducts = products.filter((p) => Number(p.current_quantity || 0) > 0).length
  const lowStockProducts = products.filter((p) => isLowStock(p)).length
  const unitsAtRisk = products
    .filter((p) => isLowStock(p))
    .reduce((sum, p) => sum + Number(p.current_quantity || 0), 0)
  const totalValue = products.reduce((sum, p) => sum + Number(p.current_quantity || 0) * Number(p.buying_price || 0), 0)

  if (loading)
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading inventory...</p>
      </div>
    )

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-xl">Stock Register</h1>
          <p className="text-zinc-500 text-xs">Live inventory balances</p>
        </div>
        <div className="flex items-center gap-2">
          {isOwnerOrManager && (
            <>
              <button
                onClick={() => navigate("/inventory/stocktake")}
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors"
              >
                Stock take
              </button>
              <button
                onClick={() => navigate("/inventory/new-stock")}
                className="bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
              >
                + New stock
              </button>
            </>
          )}
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* Metrics */}
        <div className={`grid gap-3 ${isOwnerOrManager ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3"}`}>
          <MetricCard label="Total units" value={totalUnits} tone="emerald" />
          <MetricCard label="Active products" value={activeProducts} tone="sky" />
          <MetricCard label="Units at risk" value={unitsAtRisk} sub={`${lowStockProducts} low stock`} tone="red" />
          {isOwnerOrManager && <MetricCard label="Inventory value" value={fmt(totalValue)} tone="amber" monoSmall />}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-white text-sm font-medium">Live Stock Positions</p>
            <div className="flex flex-col md:flex-row gap-2 md:w-auto w-full">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or SKU..."
                className="md:w-72 w-full bg-zinc-950 border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
              />
              <button
                onClick={() => setMobileFilterOpen(true)}
                className="md:hidden bg-zinc-950 border border-zinc-700 text-zinc-300 rounded-xl px-3 py-3 text-sm font-medium"
              >
                Filters
              </button>
              <div className="hidden md:flex gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 text-zinc-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500"
              >
                <option value="all">All categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 text-zinc-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500"
              >
                <option value="all">All stock</option>
                <option value="low">Low stock</option>
                <option value="healthy">Healthy</option>
                <option value="out">Out of stock</option>
              </select>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <p className="text-zinc-600 text-sm">No products found</p>
              <button
                onClick={() => navigate("/inventory/new-stock")}
                className="mt-4 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                Add your first product
              </button>
            </div>
          ) : (
            <>
              <div className="md:hidden p-2 space-y-2">
                {filtered.map((p) => {
                  const low = isLowStock(p)
                  const quantity = Number(p.current_quantity || 0)
                  const reorder = Number(p.reorder_point || 0)

                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      className="w-full text-left bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium truncate">{p.name}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">SKU {p.sku_id} · {p.category || "-"}</p>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                            low ? "bg-red-400/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {quantity === 0 ? "Out" : low ? "Low" : "Healthy"}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                        <p className="text-zinc-500">Units <span className="text-zinc-200 font-mono">{quantity}</span></p>
                        <p className="text-zinc-500 text-right">Reorder <span className="text-zinc-300 font-mono">{reorder}</span></p>
                        <p className="text-zinc-500">Buying <span className="text-zinc-300 font-mono">{fmt(p.buying_price || 0)}</span></p>
                        <p className="text-zinc-500 text-right">Selling <span className="text-emerald-400 font-mono">{fmt(p.selling_price || 0)}</span></p>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[920px]">
                  <thead className="sticky top-0 bg-zinc-900 z-10">
                    <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                      <th className="py-3 px-4 font-medium">SKU</th>
                      <th className="py-3 px-4 font-medium">Product</th>
                      <th className="py-3 px-4 font-medium">Category</th>
                      <th className="py-3 px-4 font-medium text-right">Units</th>
                      <th className="py-3 px-4 font-medium text-right">Reorder</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium text-right">Buying</th>
                      <th className="py-3 px-4 font-medium text-right">Selling</th>
                      {isOwner && <th className="py-3 px-4 font-medium text-right">Value</th>}
                      <th className="py-3 px-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const low = isLowStock(p)
                      const quantity = Number(p.current_quantity || 0)
                      const reorder = Number(p.reorder_point || 0)
                      const value = quantity * Number(p.buying_price || 0)

                      return (
                        <tr
                          key={p.id}
                          onClick={() => navigate(`/inventory/product/${p.id}`)}
                          className="border-b border-zinc-900 hover:bg-zinc-900/60 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-4 text-[11px] text-zinc-400 font-mono">{p.sku_id}</td>
                          <td className="py-3 px-4">
                            <p className="text-sm text-white font-medium leading-tight">{p.name}</p>
                          </td>
                          <td className="py-3 px-4 text-xs text-zinc-400">{p.category || "-"}</td>
                          <td className="py-3 px-4 text-xs text-right font-mono text-zinc-200">{quantity}</td>
                          <td className="py-3 px-4 text-xs text-right font-mono text-zinc-500">{reorder}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                                low ? "bg-red-400/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
                              }`}
                            >
                              {quantity === 0 ? "Out" : low ? "Low" : "Healthy"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-right font-mono text-zinc-300">{fmt(p.buying_price || 0)}</td>
                          <td className="py-3 px-4 text-xs text-right font-mono text-emerald-400">{fmt(p.selling_price || 0)}</td>
                          {isOwner && <td className="py-3 px-4 text-xs text-right font-mono text-zinc-200">{fmt(value)}</td>}
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/inventory/product/${p.id}`)
                              }}
                              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] px-2 py-1 rounded-lg transition-colors"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="md:hidden fixed bottom-24 left-4 right-4 z-30 grid grid-cols-2 gap-2">
        <button
          onClick={() => navigate("/inventory/stocktake")}
          className="bg-zinc-900/95 border border-zinc-800 text-zinc-200 rounded-xl py-3 text-sm font-medium"
        >
          Stock take
        </button>
        <button
          onClick={() => navigate("/inventory/new-stock")}
          className="bg-emerald-500 text-black rounded-xl py-3 text-sm font-semibold"
        >
          + New stock
        </button>
      </div>

      <FloatingBottomNav active="inventory" />

      {mobileFilterOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/60" onClick={() => setMobileFilterOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
            <p className="text-white text-sm font-semibold mb-4">Inventory filters</p>

            <div className="space-y-4">
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-3 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="all">All categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Stock status</label>
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-3 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="all">All stock</option>
                  <option value="low">Low stock</option>
                  <option value="healthy">Healthy</option>
                  <option value="out">Out of stock</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => {
                    setCategoryFilter("all")
                    setRiskFilter("all")
                  }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl py-3 text-sm font-medium transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl py-3 text-sm font-semibold transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/60" onClick={() => setSelectedProduct(null)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
            <p className="text-white text-base font-semibold">{selectedProduct.name}</p>
            <p className="text-zinc-500 text-xs mt-1">SKU {selectedProduct.sku_id}</p>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="text-zinc-500">Category</p>
                <p className="text-zinc-300">{selectedProduct.category || "-"}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-zinc-500">Units</p>
                <p className="text-zinc-200 font-mono">{Number(selectedProduct.current_quantity || 0)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-zinc-500">Reorder point</p>
                <p className="text-zinc-300 font-mono">{Number(selectedProduct.reorder_point || 0)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-zinc-500">Buying</p>
                <p className="text-zinc-300 font-mono">{fmt(selectedProduct.buying_price || 0)}</p>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                <p className="text-zinc-500">Selling</p>
                <p className="text-emerald-400 font-mono">{fmt(selectedProduct.selling_price || 0)}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedProduct(null)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl py-3 text-sm font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => navigate(`/inventory/product/${selectedProduct.id}`)}
                className="bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl py-3 text-sm font-semibold transition-colors"
              >
                View product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, sub, tone = "emerald", monoSmall = false }) {
  const toneClass = {
    emerald: "before:bg-emerald-400",
    sky: "before:bg-sky-400",
    red: "before:bg-red-400",
    amber: "before:bg-amber-400",
  }[tone]

  return (
    <div className={`relative overflow-hidden bg-zinc-900 border border-zinc-800 rounded-xl p-3 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] ${toneClass}`}>
      <p className="text-zinc-500 text-[10px] uppercase tracking-wide mb-1">{label}</p>
      <p className={`font-bold font-mono text-white ${monoSmall ? "text-sm" : "text-xl"}`}>{value}</p>
      {sub && <p className="text-zinc-600 text-[10px] mt-0.5">{sub}</p>}
    </div>
  )
}

