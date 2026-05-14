// src/pages/inventory/Inventory.jsx
import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import FloatingBottomNav from "../../components/layout/FloatingBottomNav"
import { AppShell, UiButton, UiCard } from "../../components/ui"
import { useInstantAuth } from "../../hooks/useInstantAuth"
import { useBranchContext } from "../../context/BranchContext"
import { BranchSelector } from "../../components/BranchSelector"
import { useProducts } from "../../hooks/useProducts"

export default function Inventory() {
  const navigate = useNavigate()
  const { business: instantBusiness, signOut } = useInstantAuth()
  const { canViewAll, effectiveBranchId, activeBranch, availableBranches } = useBranchContext()

  const { products, loading } = useProducts(
    effectiveBranchId,
    canViewAll,
  )
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [riskFilter, setRiskFilter] = useState("all")
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
    const categories = useMemo(() => [...new Set(products.map((product) => product.category).filter(Boolean))], [products])

  const filtered = useMemo(() => {
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

    return result
  }, [search, categoryFilter, riskFilter, products])

  const isLowStock = (p) => Number(p.current_quantity || 0) <= Number(p.reorder_point || 0)

  const handleSignOut = async () => {
    await signOut()
  }

  const fmt = (n) => `KES ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`

  const metrics = useMemo(() => {
    const totalUnits = products.reduce((sum, p) => sum + Number(p.current_quantity || 0), 0)
    const activeProducts = products.filter((p) => Number(p.current_quantity || 0) > 0).length
    const lowStockProducts = products.filter((p) => isLowStock(p)).length
    const unitsAtRisk = products
      .filter((p) => isLowStock(p))
      .reduce((sum, p) => sum + Number(p.current_quantity || 0), 0)
    const totalValue = products.reduce((sum, p) => sum + Number(p.current_quantity || 0) * Number(p.buying_price || 0), 0)

    return {
      totalUnits,
      activeProducts,
      lowStockProducts,
      unitsAtRisk,
      totalValue
    }
  }, [products])

  const isOwnerOrManager = canViewAll

  return (
    <AppShell showHeader={false} className="pb-24" contentClassName="max-w-6xl space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5 shadow-lg shadow-black/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Store</p>
          <h1 className="text-white font-semibold text-xl sm:text-2xl tracking-tight">Inventory</h1>
          <p className="mt-1 text-zinc-400 text-xs sm:text-sm">
            {instantBusiness?.name}{effectiveBranchId ? ` • ${availableBranches.find(b => b.id === effectiveBranchId)?.name}` : ''} · Live inventory balances
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canViewAll ? <BranchSelector /> : null}
          <UiButton variant="tertiary" size="sm" onClick={handleSignOut} className="text-zinc-400 hover:text-red-400">
            Sign out
          </UiButton>
        </div>
      </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <UiButton variant="secondary" size="md" onClick={() => navigate("/inventory/stock-take")} className="w-full justify-center">
            Stock take
          </UiButton>
          <UiButton variant="primary" size="md" onClick={() => navigate("/inventory/new-stock")} className="w-full justify-center">
            + New stock
          </UiButton>
          <UiButton variant="tertiary" size="md" onClick={() => navigate("/products")} className="w-full justify-center">
            View All Products
          </UiButton>
        </div>
      </div>

      <div className="space-y-4">
        {/* Metrics */}
        <div className={`grid gap-3 ${isOwnerOrManager ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3"}`}>
          <MetricCard label="Total units" value={metrics.totalUnits} tone="emerald" />
          <MetricCard label="Active products" value={metrics.activeProducts} tone="sky" />
          <MetricCard label="Units at risk" value={metrics.unitsAtRisk} sub={`${metrics.lowStockProducts} low stock`} tone="red" />
          {isOwnerOrManager && <MetricCard label="Inventory value" value={fmt(metrics.totalValue)} tone="amber" monoSmall />}
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

          {loading ? (
            <UiCard>
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                  <p className="text-zinc-400">Loading products...</p>
                </div>
              </div>
            </UiCard>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <p className="text-zinc-600 text-sm">No products found</p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden p-2 space-y-2">
                {filtered.map((p) => {
                  const low = isLowStock(p)
                  const quantity = Number(p.current_quantity || 0)
                  const reorder = Number(p.reorder_point || 0)

                  return (
                    <div key={p.id} className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white font-medium truncate">{p.name}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">SKU {p.sku_id} · {p.category || "-"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                              low ? "bg-red-400/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
                            }`}
                          >
                            {quantity === 0 ? "Out" : low ? "Low" : "Healthy"}
                          </span>
                          <button
                            onClick={() => navigate(`/inventory/product/${p.id}`)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] px-2 py-1 rounded-lg transition-colors"
                          >
                            View
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                        <p className="text-zinc-500">Units <span className="text-zinc-200 font-mono">{quantity}</span></p>
                        <p className="text-zinc-500 text-right">Reorder <span className="text-zinc-300 font-mono">{reorder}</span></p>
                        <p className="text-zinc-500">Buying <span className="text-zinc-300 font-mono">{fmt(p.buying_price || 0)}</span></p>
                        <p className="text-zinc-500 text-right">Selling <span className="text-emerald-400 font-mono">{fmt(p.selling_price || 0)}</span></p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop View */}
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
                      {canViewAll && <th className="py-3 px-4 font-medium text-right">Value</th>}
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
                          className="border-b border-zinc-900 hover:bg-zinc-800/60 cursor-pointer transition-colors"
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
                          {canViewAll && <td className="py-3 px-4 text-xs text-right font-mono text-zinc-200">{fmt(value)}</td>}
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

          </AppShell>
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

