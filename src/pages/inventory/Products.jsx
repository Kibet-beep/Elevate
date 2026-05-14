// src/pages/inventory/Products.jsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { AppShell, UiButton } from "../../components/ui"
import { useBranchContext } from "../../context/BranchContext"
import { useInstantAuth } from "../../hooks/useInstantAuth"
import { useProducts } from "../../hooks/useProducts"

export default function Products() {
  const navigate = useNavigate()
  const { business: instantBusiness, signOut } = useInstantAuth()
  const { canViewAll, availableBranches, effectiveBranchId } = useBranchContext()
  const [branchFilter, setBranchFilter] = useState("all")
  
  const scopedBranchId =
  canViewAll
    ? (branchFilter === "all" ? null : branchFilter)
    : effectiveBranchId

  const { products: liveProducts } = useProducts(
    scopedBranchId,
    canViewAll,
  )
  
  const [products, setProducts] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categories, setCategories] = useState([])

  useEffect(() => {
    setProducts(liveProducts)
  }, [liveProducts])

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
        if (statusFilter !== "all") {
      if (statusFilter === "active") {
        result = result.filter((p) => Number(p.current_quantity || 0) > 0)
      } else if (statusFilter === "low") {
        result = result.filter((p) => Number(p.current_quantity || 0) <= Number(p.reorder_point || 0))
      } else if (statusFilter === "out") {
        result = result.filter((p) => Number(p.current_quantity || 0) === 0)
      }
    }

    setFiltered(result)
  }, [search, categoryFilter, branchFilter, statusFilter, products, canViewAll])

  useEffect(() => {
    setCategories([...new Set(products.map((p) => p.category).filter(Boolean))])
  }, [products])

  const fmt = (n) => `KES ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`

  const totalProducts = products.length
  const activeProducts = products.filter((p) => Number(p.current_quantity || 0) > 0).length
  const lowStockProducts = products.filter((p) => Number(p.current_quantity || 0) <= Number(p.reorder_point || 0)).length
  const outOfStockProducts = products.filter((p) => Number(p.current_quantity || 0) === 0).length

  return (
    <AppShell showHeader={false} contentClassName="max-w-7xl space-y-4 pb-24">
      {/* Back button */}
      <div className="px-4 sm:px-5 pt-4 pb-2">
        <button onClick={() => navigate("/inventory")} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm">
          ← Back
        </button>
      </div>
      {/* Hero header */}
      <div className="px-4 sm:px-5 pb-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5 shadow-lg shadow-black/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Inventory</p>
              <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">All Products</h1>
              <p className="mt-1 text-zinc-400 text-xs sm:text-sm">
                {instantBusiness?.name} · {canViewAll ? "Complete catalog across all branches" : "Product catalog for your branch"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => signOut()} className="text-zinc-400 hover:text-red-400 transition-colors text-sm">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-5">
      <div className="space-y-4">
        {/* Metrics */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <MetricCard label="Total products" value={totalProducts} tone="emerald" />
          <MetricCard label="In stock" value={activeProducts} tone="sky" />
          <MetricCard label="Low stock" value={lowStockProducts} tone="amber" />
          <MetricCard label="Out of stock" value={outOfStockProducts} tone="red" />
        </div>

        {/* Filters */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or SKU..."
              className="flex-1 bg-zinc-950 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 text-zinc-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500"
            >
              <option value="all">All categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {canViewAll && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 text-zinc-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="all">All branches</option>
                {availableBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} {branch.code ? `(${branch.code})` : ""}
                  </option>
                ))}
              </select>
            )}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 text-zinc-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500"
            >
              <option value="all">All status</option>
              <option value="active">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-white text-sm font-medium">Product Catalog ({filtered.length} products)</p>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <p className="text-zinc-600 text-sm">No products found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="sticky top-0 bg-zinc-900 z-10">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                    <th className="py-3 px-4 font-medium">SKU</th>
                    <th className="py-3 px-4 font-medium">Product</th>
                    <th className="py-3 px-4 font-medium">Category</th>
                    <th className="py-3 px-4 font-medium">Branch</th>
                    <th className="py-3 px-4 font-medium text-right">Stock</th>
                    <th className="py-3 px-4 font-medium text-right">Buying</th>
                    <th className="py-3 px-4 font-medium text-right">Selling</th>
                    <th className="py-3 px-4 font-medium text-right">Margin</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const quantity = Number(p.current_quantity || 0)
                    const reorder = Number(p.reorder_point || 0)
                    const buying = Number(p.buying_price || 0)
                    const selling = Number(p.selling_price || 0)
                    const margin = selling - buying
                    const marginPct = selling > 0 ? (margin / selling) * 100 : 0
                    const isLowStock = quantity <= reorder
                    const isOutOfStock = quantity === 0

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
                        <td className="py-3 px-4 text-xs text-zinc-400">
                          {(() => {
                            if (!canViewAll) {
                              // For non-owners/managers, don't show branch column
                              return "-"
                            }
                            if (!availableBranches || availableBranches.length === 0) {
                              return p.branch_id || "Loading..."
                            }
                            const branch = availableBranches.find(b => b.id === p.branch_id)
                            return branch ? `${branch.name}${branch.code ? ` (${branch.code})` : ""}` : p.branch_id || "Unknown"
                          })()}
                        </td>
                        <td className="py-3 px-4 text-xs text-right font-mono text-zinc-200">{quantity}</td>
                        <td className="py-3 px-4 text-xs text-right font-mono text-zinc-300">{fmt(buying)}</td>
                        <td className="py-3 px-4 text-xs text-right font-mono text-emerald-400">{fmt(selling)}</td>
                        <td className="py-3 px-4 text-xs text-right font-mono text-zinc-200">{fmt(margin)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                              isOutOfStock ? "bg-red-400/10 text-red-400" : 
                              isLowStock ? "bg-amber-400/10 text-amber-400" : 
                              "bg-emerald-500/10 text-emerald-400"
                            }`}
                          >
                            {isOutOfStock ? "Out" : isLowStock ? "Low" : "In Stock"}
                          </span>
                        </td>
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
          )}
        </div>
      </div>
      </div>
    </AppShell>
  )
}

function MetricCard({ label, value, tone = "emerald" }) {
  const toneClass = {
    emerald: "before:bg-emerald-400",
    sky: "before:bg-sky-400",
    amber: "before:bg-amber-400",
    red: "before:bg-red-400",
  }[tone]

  return (
    <div className={`relative overflow-hidden bg-zinc-900 border border-zinc-800 rounded-xl p-3 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] ${toneClass}`}>
      <p className="text-zinc-500 text-[10px] uppercase tracking-wide mb-1">{label}</p>
      <p className="font-bold font-mono text-white text-xl">{value}</p>
    </div>
  )
}
