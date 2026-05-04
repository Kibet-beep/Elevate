// src/pages/settings/reports/SalesReport.jsx
import { useState, useEffect, useMemo } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate, useSearchParams } from "react-router-dom"

const PERIODS = ["Day", "Week", "Month", "Quarter"]
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000

export default function SalesReport() {
  const navigate = useNavigate()
  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate("/settings", { replace: true })
  }
  const [searchParams] = useSearchParams()
  const todayIso = new Date().toISOString().split("T")[0]

  const [period, setPeriod] = useState("Day")
  const [businessId, setBusinessId] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [prevTransactions, setPrevTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [compareMode, setCompareMode] = useState(false)
  const [compareType, setCompareType] = useState("relative")
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")

  // Date anchor — defaults to today, can be changed by picker
  const dateParam = searchParams.get("date")
  const [anchorDate, setAnchorDate] = useState(
    dateParam || todayIso
  )
  const [compareDateA, setCompareDateA] = useState(dateParam || todayIso)
  const [compareDateB, setCompareDateB] = useState(todayIso)

  useEffect(() => {
    if (dateParam) { setPeriod("Day"); setAnchorDate(dateParam) }
    fetchUser()
  }, [])

  useEffect(() => {
    if (businessId) fetchData()
  }, [period, businessId, anchorDate, compareMode, compareType, compareDateA, compareDateB])

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase
      .from("users")
      .select("business_id")
      .eq("id", user.id)
      .single()
    setBusinessId(userData.business_id)
  }

  // ── Range calculation ──
  const getRange = (anchor, forPrev = false) => {
    const base = new Date(anchor + "T12:00:00Z")

    let start, end

    if (period === "Day") {
      const d = forPrev
        ? new Date(base.getTime() - 86400000)
        : base
      start = new Date(d.toISOString().split("T")[0] + "T00:00:00.000Z")
      end = new Date(d.toISOString().split("T")[0] + "T23:59:59.999Z")
    } else if (period === "Week") {
      const day = base.getUTCDay()
      const daysSinceMonday = (day + 6) % 7
      const weekStart = new Date(base)
      weekStart.setUTCDate(base.getUTCDate() - daysSinceMonday)
      weekStart.setUTCHours(0, 0, 0, 0)
      if (forPrev) weekStart.setUTCDate(weekStart.getUTCDate() - 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setUTCDate(weekStart.getUTCDate() + 6)
      weekEnd.setUTCHours(23, 59, 59, 999)
      start = weekStart; end = weekEnd
    } else if (period === "Month") {
      const y = base.getUTCFullYear()
      const m = forPrev ? base.getUTCMonth() - 1 : base.getUTCMonth()
      start = new Date(Date.UTC(y, m, 1, 0, 0, 0))
      end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999))
    } else if (period === "Quarter") {
      const m = base.getUTCMonth()
      const qStart = Math.floor(m / 3) * 3
      const offset = forPrev ? -3 : 0
      start = new Date(Date.UTC(base.getUTCFullYear(), qStart + offset, 1, 0, 0, 0))
      end = new Date(Date.UTC(base.getUTCFullYear(), qStart + offset + 3, 0, 23, 59, 59, 999))
    }

    return { start: start.toISOString(), end: end.toISOString() }
  }

  const fetchTxnsByRange = async (start, end) => {
    const { data } = await supabase
      .from("transactions")
      .select(`id, date, payment_account, sale_items(quantity, unit_price, total_amount, products(name, sku_id, category))`)
      .eq("business_id", businessId)
      .eq("type", "sale")
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true })

    return data || []
  }

  const fetchData = async () => {
    setLoading(true)

    if (compareMode && compareType === "custom") {
      const aRange = getRange(compareDateA)
      const bRange = getRange(compareDateB)
      const [aData, bData] = await Promise.all([
        fetchTxnsByRange(aRange.start, aRange.end),
        fetchTxnsByRange(bRange.start, bRange.end),
      ])
      setPrevTransactions(aData)
      setTransactions(bData)
      setLoading(false)
      return
    }

    const { start, end } = getRange(anchorDate)
    const currentData = await fetchTxnsByRange(start, end)
    setTransactions(currentData)

    if (compareMode) {
      const { start: ps, end: pe } = getRange(anchorDate, true)
      const prevData = await fetchTxnsByRange(ps, pe)
      setPrevTransactions(prevData)
    } else {
      setPrevTransactions([])
    }

    setLoading(false)
  }

  const fmt = (n) => `KES ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
  const fmtShort = (n) => `KES ${Math.round(n).toLocaleString("en-KE")}`

  // ── Build rows ──
  const buildDayRows = (txns) => {
    const rows = []
    for (const txn of txns) {
      for (const item of txn.sale_items || []) {
        rows.push({
          time: new Date(txn.date).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
          sku: item.products?.sku_id || "-",
          name: item.products?.name || "-",
          category: item.products?.category || "",
          qty: item.quantity,
          unitPrice: item.unit_price,
          total: item.total_amount,
          payment: txn.payment_account,
        })
      }
    }
    return rows
  }

  const buildGroupedRows = (txns) => {
    const map = {}
    for (const txn of txns) {
      for (const item of txn.sale_items || []) {
        const key = item.products?.sku_id || item.products?.name || "unknown"
        if (!map[key]) {
          map[key] = {
            sku: item.products?.sku_id || "-",
            name: item.products?.name || "-",
            category: item.products?.category || "",
            unitPrice: item.unit_price,
            qty: 0,
            total: 0,
          }
        }
        map[key].qty += item.quantity
        map[key].total += item.total_amount
      }
    }
    return Object.values(map)
  }

  const buildPaymentBreakdown = (txns) => {
    const map = {}
    for (const txn of txns) {
      const amount = txn.sale_items?.reduce((s, i) => s + i.total_amount, 0) || 0
      if (!map[txn.payment_account]) map[txn.payment_account] = 0
      map[txn.payment_account] += amount
    }
    return map
  }

  const buildTopProducts = (txns) => {
    const map = {}
    for (const txn of txns) {
      for (const item of txn.sale_items || []) {
        const key = item.products?.sku_id || item.products?.name || "unknown"
        if (!map[key]) map[key] = { name: item.products?.name || "-", qty: 0, total: 0 }
        map[key].qty += item.quantity
        map[key].total += item.total_amount
      }
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5)
  }

  const isDay = period === "Day"

  const allRows = isDay ? buildDayRows(transactions) : buildGroupedRows(transactions)
  const prevRows = isDay ? buildDayRows(prevTransactions) : buildGroupedRows(prevTransactions)

  // ── Categories for filter ──
  const categories = useMemo(() => {
    const cats = [...new Set([...allRows, ...prevRows].map(r => r.category).filter(Boolean))]
    return cats
  }, [allRows, prevRows])

  // ── Apply search + category filter ──
  const filteredRows = useMemo(() => {
    let rows = allRows
    if (search) rows = rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.sku.toLowerCase().includes(search.toLowerCase()))
    if (categoryFilter !== "all") rows = rows.filter(r => r.category === categoryFilter)
    return rows
  }, [allRows, search, categoryFilter])

  const filteredPrevRows = useMemo(() => {
    let rows = prevRows
    if (search) rows = rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.sku.toLowerCase().includes(search.toLowerCase()))
    if (categoryFilter !== "all") rows = rows.filter(r => r.category === categoryFilter)
    return rows
  }, [prevRows, search, categoryFilter])

  const totalSales = transactions.reduce((s, t) => s + (t.sale_items?.reduce((a, i) => a + i.total_amount, 0) || 0), 0)
  const prevTotalSales = prevTransactions.reduce((s, t) => s + (t.sale_items?.reduce((a, i) => a + i.total_amount, 0) || 0), 0)
  const salesDiff = totalSales - prevTotalSales
  const paymentBreakdown = buildPaymentBreakdown(transactions)
  const topProducts = buildTopProducts(transactions)

  const accountLabel = (acc) => {
    if (acc === "mpesa") return "M-Pesa"
    return acc ? acc.charAt(0).toUpperCase() + acc.slice(1) : "-"
  }

  // ── Period label ──
  const periodLabel = (baseDate, forPrev = false) => {
    const anchor = new Date(baseDate + "T12:00:00Z")
    if (period === "Day") {
      const d = forPrev ? new Date(anchor.getTime() - 86400000) : anchor
      return d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    }
    if (period === "Week") {
      const day = anchor.getUTCDay()
      const daysSinceMonday = (day + 6) % 7
      const ws = new Date(anchor)
      ws.setUTCDate(anchor.getUTCDate() - daysSinceMonday)
      if (forPrev) ws.setUTCDate(ws.getUTCDate() - 7)
      return `Week of ${ws.toLocaleDateString("en-KE", { day: "numeric", month: "short" })}`
    }
    if (period === "Month") {
      const d = forPrev ? new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 1, 1)) : anchor
      return d.toLocaleDateString("en-KE", { month: "long", year: "numeric" })
    }
    if (period === "Quarter") {
      const d = new Date(anchor)
      if (forPrev) d.setUTCMonth(d.getUTCMonth() - 3)
      const q = Math.floor(d.getUTCMonth() / 3) + 1
      return `Q${q} ${d.getUTCFullYear()}`
    }
  }

  // ── Table component ──
  const SalesTable = ({ rows, isDay }) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px]">
        <thead>
          <tr className="border-b border-zinc-800">
            {isDay && <th className="text-left text-[10px] uppercase tracking-widest text-zinc-600 font-medium px-4 py-3">Time</th>}
            <th className="text-left text-[10px] uppercase tracking-widest text-zinc-600 font-medium px-4 py-3">Product</th>
            <th className="text-right text-[10px] uppercase tracking-widest text-zinc-600 font-medium px-4 py-3">Qty</th>
            <th className="text-right text-[10px] uppercase tracking-widest text-zinc-600 font-medium px-4 py-3">Total</th>
            {isDay && <th className="text-right text-[10px] uppercase tracking-widest text-zinc-600 font-medium px-4 py-3">Via</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={isDay ? 5 : 4} className="px-4 py-8 text-center text-zinc-600 text-xs">No sales</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-900 hover:bg-zinc-800/30 transition-colors">
              {isDay && <td className="px-4 py-3 text-xs text-zinc-500 font-mono whitespace-nowrap">{row.time}</td>}
              <td className="px-4 py-3">
                <p className="text-white text-xs font-medium leading-tight">{row.name}</p>
                <p className="text-zinc-600 text-[10px] font-mono mt-0.5">{row.sku}</p>
              </td>
              <td className="px-4 py-3 text-xs text-right font-mono text-zinc-400">{row.qty}</td>
              <td className="px-4 py-3 text-xs text-right font-mono text-emerald-400 font-medium whitespace-nowrap">{fmtShort(row.total)}</td>
              {isDay && <td className="px-4 py-3 text-[10px] text-right text-zinc-500">{accountLabel(row.payment)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 pb-16">

      {/* Header */}
      <div className="px-4 pt-6 pb-4 w-full max-w-screen-2xl mx-auto">
        <button
          onClick={goBack}
          aria-label="Back"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors mb-5"
        >
          ←
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-xl tracking-tight">Sales Records</h1>
            <p className="text-zinc-500 text-xs mt-0.5">{periodLabel(anchorDate)}</p>
          </div>
          <button
            onClick={() => setCompareMode(v => !v)}
            className={`text-xs font-medium px-3 py-2 rounded-xl transition-colors ${compareMode ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-400"}`}
          >
            Compare
          </button>
        </div>
      </div>

      <div className="px-4 w-full max-w-screen-2xl mx-auto space-y-3">

        {/* Period selector */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-1 flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setSearch(""); setCategoryFilter("all") }}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${period === p ? "bg-emerald-500 text-black" : "text-zinc-400"}`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Compare type + date pickers */}
        {compareMode ? (
          <div className="space-y-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-1 flex gap-1">
              <button
                onClick={() => setCompareType("relative")}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${compareType === "relative" ? "bg-emerald-500 text-black" : "text-zinc-400"}`}
              >
                Relative
              </button>
              <button
                onClick={() => setCompareType("custom")}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${compareType === "custom" ? "bg-emerald-500 text-black" : "text-zinc-400"}`}
              >
                Custom
              </button>
            </div>

            {compareType === "relative" ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-zinc-500 text-xs">
                  {period === "Day" ? "Pick a date" : period === "Week" ? "Pick any date in the week" : period === "Month" ? "Pick any date in the month" : "Pick any date in the quarter"}
                </p>
                <input
                  type="date"
                  value={anchorDate}
                  onChange={e => setAnchorDate(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest">Period A</p>
                  <input
                    type="date"
                    value={compareDateA}
                    onChange={e => setCompareDateA(e.target.value)}
                    className="mt-2 w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 transition-colors"
                  />
                  <p className="text-zinc-500 text-[10px] mt-2">{periodLabel(compareDateA)}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest">Period B</p>
                  <input
                    type="date"
                    value={compareDateB}
                    onChange={e => setCompareDateB(e.target.value)}
                    className="mt-2 w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 transition-colors"
                  />
                  <p className="text-zinc-500 text-[10px] mt-2">{periodLabel(compareDateB)}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-zinc-500 text-xs">
              {period === "Day" ? "Pick a date" : period === "Week" ? "Pick any date in the week" : period === "Month" ? "Pick any date in the month" : "Pick any date in the quarter"}
            </p>
            <input
              type="date"
              value={anchorDate}
              onChange={e => setAnchorDate(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        )}

        {/* Search + category filter */}
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search product or SKU..."
            className="flex-1 bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-2.5 text-xs outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
          />
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-emerald-500"
            >
              <option value="all">All</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        {loading ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center py-20">
            <p className="text-zinc-600 text-sm">Loading...</p>
          </div>
        ) : compareMode ? (
          /* ── COMPARE MODE ── */
          <div className="space-y-3">
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
              {/* Previous period */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="border-b border-zinc-800 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium">{compareType === "custom" ? "Period A" : "Previous"}</p>
                  <p className="text-zinc-400 text-xs font-medium mt-0.5">{compareType === "custom" ? periodLabel(compareDateA) : periodLabel(anchorDate, true)}</p>
                  <p className="text-white font-bold font-mono text-sm mt-1">{fmtShort(prevTotalSales)}</p>
                </div>
                <SalesTable rows={filteredPrevRows} isDay={isDay} />
              </div>

              {/* Current period */}
              <div className="bg-zinc-900 border border-emerald-500/20 rounded-2xl overflow-hidden">
                <div className="border-b border-zinc-800 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-medium">{compareType === "custom" ? "Period B" : "Current"}</p>
                  <p className="text-zinc-400 text-xs font-medium mt-0.5">{compareType === "custom" ? periodLabel(compareDateB) : periodLabel(anchorDate)}</p>
                  <p className="text-emerald-400 font-bold font-mono text-sm mt-1">{fmtShort(totalSales)}</p>
                </div>
                <SalesTable rows={filteredRows} isDay={isDay} />
              </div>
            </div>

            {/* Difference */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 flex items-center justify-between">
              <p className="text-zinc-400 text-sm">Difference</p>
              <div className="text-right">
                <p className={`font-bold font-mono text-base ${salesDiff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {salesDiff >= 0 ? "+" : ""}{fmtShort(salesDiff)}
                </p>
                {prevTotalSales > 0 && (
                  <p className={`text-xs mt-0.5 ${salesDiff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {salesDiff >= 0 ? "▲" : "▼"} {Math.abs((salesDiff / prevTotalSales) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── NORMAL MODE ── */
          <div className="space-y-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="border-b border-zinc-800 px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Sales · {period}</p>
                <p className="text-white font-semibold text-sm mt-0.5">{periodLabel(anchorDate)}</p>
              </div>

              {filteredRows.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <p className="text-zinc-600 text-sm">No sales for this period</p>
                </div>
              ) : (
                <SalesTable rows={filteredRows} isDay={isDay} />
              )}

              {/* Totals */}
              {filteredRows.length > 0 && (
                <div className="border-t border-zinc-700 px-4 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-zinc-400 text-sm font-medium">Total sales</p>
                    <p className="text-white font-bold font-mono">{fmt(totalSales)}</p>
                  </div>
                  {Object.keys(paymentBreakdown).length > 0 && (
                    <div className="border-t border-zinc-800 pt-3 space-y-2">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium">Payment breakdown</p>
                      {Object.entries(paymentBreakdown).map(([method, amount]) => (
                        <div key={method} className="flex items-center justify-between">
                          <p className="text-zinc-500 text-sm">{accountLabel(method)}</p>
                          <p className="text-zinc-300 font-mono text-sm">{fmt(amount)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Top products */}
            {topProducts.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="border-b border-zinc-800 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Top products · {period}</p>
                </div>
                <div className="px-4 py-3 space-y-3">
                  {topProducts.map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        <span className="text-zinc-500 text-[10px] font-bold">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{p.name}</p>
                        <p className="text-zinc-600 text-[10px]">{p.qty} units</p>
                      </div>
                      <p className="text-emerald-400 text-xs font-mono font-medium whitespace-nowrap">{fmtShort(p.total)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}