// src/pages/settings/reports/ProfitLossReport.jsx
import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import { useBranchContext } from "../../hooks/useBranchContext"
import { BranchSelector } from "../../components/BranchSelector"

const PERIODS = ["Day", "Week", "Month", "Quarter", "Year"]
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000

export default function ProfitLossReport() {
  const navigate = useNavigate()
  const { currentBranchId, viewMode, canViewAll, activeBranch } = useBranchContext()
  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate("/settings", { replace: true })
  }
  const [period, setPeriod] = useState("Month")
  const [businessId, setBusinessId] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser()
  }, [])

  useEffect(() => {
    if (businessId) fetchData()
  }, [period, businessId, currentBranchId, viewMode])

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase
      .from("users")
      .select("business_id")
      .eq("id", user.id)
      .single()
    setBusinessId(userData.business_id)
  }

  const getEATNow = () => new Date(Date.now() + EAT_OFFSET_MS)
  const toUtc = (eatDate) => new Date(eatDate.getTime() - EAT_OFFSET_MS).toISOString()

  const getRange = () => {
    const now = getEATNow()
    const start = new Date(now)

    if (period === "Day") {
      start.setUTCHours(0, 0, 0, 0)
    } else if (period === "Week") {
      const day = now.getUTCDay()
      const daysSinceMonday = (day + 6) % 7
      start.setUTCDate(now.getUTCDate() - daysSinceMonday)
      start.setUTCHours(0, 0, 0, 0)
    } else if (period === "Month") {
      start.setUTCDate(1)
      start.setUTCHours(0, 0, 0, 0)
    } else if (period === "Quarter") {
      const month = now.getUTCMonth()
      const quarterStart = Math.floor(month / 3) * 3
      start.setUTCMonth(quarterStart, 1)
      start.setUTCHours(0, 0, 0, 0)
    } else if (period === "Year") {
      start.setUTCMonth(0, 1)
      start.setUTCHours(0, 0, 0, 0)
    }

    return { start: toUtc(start), end: new Date().toISOString() }
  }

  const fetchData = async () => {
    setLoading(true)
    const { start, end } = getRange()

    let salesQuery = supabase
      .from("transactions")
      .select("branch_id, sale_items(quantity, total_amount, products(buying_price))")
      .eq("business_id", businessId)
      .eq("type", "sale")
      .gte("date", start)
      .lte("date", end)

    let expenseQuery = supabase
      .from("transactions")
      .select("branch_id, expenses(amount, category)")
      .eq("business_id", businessId)
      .eq("type", "expense")
      .gte("date", start)
      .lte("date", end)

    if (viewMode === 'branch' && currentBranchId) {
      salesQuery = salesQuery.eq("branch_id", currentBranchId)
      expenseQuery = expenseQuery.eq("branch_id", currentBranchId)
    }

    // Sales
    const { data: saleTxns } = await salesQuery

    // Expenses
    const { data: expTxns } = await expenseQuery

    // Revenue
    const revenue = (saleTxns || []).reduce((s, txn) =>
      s + (txn.sale_items?.reduce((a, i) => a + i.total_amount, 0) || 0), 0)

    // COGS: landed cost per unit Ã— qty sold
    const cogs = (saleTxns || []).reduce((s, txn) =>
      s + (txn.sale_items?.reduce((a, i) =>
        a + ((i.products?.buying_price || 0) * i.quantity), 0) || 0), 0)

    const grossProfit = revenue - cogs
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0

    // Operating expenses by category
    const expenseMap = {}
    for (const txn of expTxns || []) {
      for (const exp of txn.expenses || []) {
        const cat = exp.category || "Miscellaneous"
        if (!expenseMap[cat]) expenseMap[cat] = 0
        expenseMap[cat] += exp.amount
      }
    }

    const totalOpex = Object.values(expenseMap).reduce((s, v) => s + v, 0)
    const netProfit = grossProfit - totalOpex
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

    setData({
      revenue,
      cogs,
      grossProfit,
      grossMargin,
      expenseMap,
      totalOpex,
      netProfit,
      netMargin,
    })

    setLoading(false)
  }

  const fmt = (n) => `KES ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
  const fmtPct = (n) => `${Number(n).toFixed(1)}%`

  const periodLabel = () => {
    const now = getEATNow()
    if (period === "Day") return now.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    if (period === "Week") return `Week of ${now.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}`
    if (period === "Month") return now.toLocaleDateString("en-KE", { month: "long", year: "numeric" })
    if (period === "Quarter") {
      const q = Math.floor(now.getUTCMonth() / 3) + 1
      return `Q${q} ${now.getUTCFullYear()}`
    }
    if (period === "Year") return `FY ${now.getUTCFullYear()}`
  }

  const reportRows = buildReportRows(data, fmtPct)
  const metricCards = buildMetricCards(data, fmt, fmtPct)
  const waterfall = buildWaterfall(data)

  return (
    <div className="min-h-screen bg-zinc-950 pb-16">
      <div className="px-4 sm:px-6 pt-8 pb-6 max-w-3xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button
              onClick={goBack}
              aria-label="Back"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors mb-6"
            >
              ←
            </button>
            <h1 className="text-white font-bold text-2xl tracking-tight">Profit & Loss</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {viewMode === 'branch' && activeBranch ? `${activeBranch.name} • ` : ''}{periodLabel()}
            </p>
          </div>
          {canViewAll ? <BranchSelector /> : null}
        </div>
      </div>

      <div className="px-4 sm:px-6 space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-1 flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                period === p ? "bg-emerald-500 text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="border-b border-zinc-800 px-4 sm:px-6 py-4">
            <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Profit & Loss · {period}</p>
            <p className="text-white font-semibold text-sm mt-1">{periodLabel()}</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-zinc-600 text-sm">Loading...</p>
            </div>
          ) : !data || data.revenue === 0 ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-zinc-600 text-sm">No data for this period</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 px-4 py-4 sm:px-6 sm:py-6 grid-cols-1 lg:grid-cols-[2fr_1fr]">
              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/60">
                <div className="border-b border-zinc-800 px-4 sm:px-5 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Income statement</p>
                  <p className="mt-1 text-sm font-semibold text-white">{periodLabel()}</p>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="px-3 sm:px-5 py-2 sm:py-3 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-600 whitespace-nowrap">Line item</th>
                        <th className="px-3 sm:px-5 py-2 sm:py-3 text-right text-[10px] font-medium uppercase tracking-widest text-zinc-600 whitespace-nowrap">KES</th>
                        <th className="px-3 sm:px-5 py-2 sm:py-3 text-right text-[10px] font-medium uppercase tracking-widest text-zinc-600 whitespace-nowrap">% Rev</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportRows.map((row) => {
                        if (row.isSection) {
                          return (
                            <tr key={row.label} className="border-b border-zinc-900/80 bg-zinc-950/80">
                              <td colSpan={3} className="px-3 sm:px-5 py-2 sm:py-3 text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">
                                {row.label}
                              </td>
                            </tr>
                          )
                        }

                        return (
                          <tr key={row.label} className={`border-b border-zinc-900/80 transition-colors hover:bg-zinc-800/30 ${row.isTotal ? "bg-zinc-950/70" : ""}`}>
                            <td className={`px-3 sm:px-5 py-2 sm:py-3 text-sm ${row.isTotal ? "font-semibold text-white" : row.isSub ? "font-medium text-zinc-100" : "text-zinc-400"} ${row.indent ? "pl-6 sm:pl-8" : ""}`}>
                              {row.label}
                              {row.subLabel ? <p className="mt-0.5 text-xs text-zinc-600">{row.subLabel}</p> : null}
                            </td>
                            <td className={`px-3 sm:px-5 py-2 sm:py-3 text-right font-mono text-xs sm:text-sm whitespace-nowrap ${row.amount >= 0 ? row.tone : "text-red-400"} ${row.isTotal ? "font-bold" : row.isSub ? "font-semibold" : ""}`}>
                              {formatCurrency(row.amount)}
                            </td>
                            <td className="px-3 sm:px-5 py-2 sm:py-3 text-right font-mono text-xs text-zinc-500 whitespace-nowrap">
                              {formatPercent(row.percent || 0)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-zinc-800 px-4 sm:px-5 py-3 sm:py-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">Net Profit</p>
                      <p className="mt-0.5 text-xs text-zinc-500">Net margin {fmtPct(data.netMargin)}</p>
                    </div>
                    <p className={`font-mono text-lg sm:text-xl font-bold whitespace-nowrap ${data.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatCurrency(data.netProfit)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 sm:px-5 py-4">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Margin waterfall</p>
                  <div className="mt-4 space-y-3">
                    {waterfall.map((item) => (
                      <div key={item.label}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                          <span className="text-zinc-400 truncate">{item.label}</span>
                          <span className={`font-mono text-xs sm:text-sm whitespace-nowrap ${item.color}`}>{formatCurrency(item.value)} ({formatPercent(item.percent)})</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, Math.round((item.percent || 0) * 100)))}%`, background: item.fill }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-1">
                  {metricCards.map((card) => (
                    <div key={card.label} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 sm:px-5 py-4">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-600">{card.label}</p>
                      <p className={`mt-2 font-mono text-xs sm:text-sm font-bold ${card.color}`}>{card.value}</p>
                      {card.sub ? <p className="mt-1 text-xs text-zinc-500">{card.sub}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function buildReportRows(reportData, fmtPctFn) {
  const revenue = reportData?.revenue || 0
  const cogs = reportData?.cogs || 0
  const grossProfit = reportData?.grossProfit || 0
  const totalOpex = reportData?.totalOpex || 0
  const netProfit = reportData?.netProfit || 0
  const expenseEntries = Object.entries(reportData?.expenseMap || {})

  return [
    { label: "Revenue", isSection: true },
    { label: "Gross revenue", amount: revenue, percent: revenue > 0 ? 1 : 0, tone: "text-white", isSub: true },
    { label: "Cost of Goods Sold", isSection: true },
    { label: "Landed cost of units sold", amount: -cogs, percent: revenue > 0 ? -cogs / revenue : 0, tone: "text-red-400", indent: true },
    { label: "Gross Profit", amount: grossProfit, percent: revenue > 0 ? grossProfit / revenue : 0, tone: grossProfit >= 0 ? "text-emerald-400" : "text-red-400", isTotal: true, subLabel: `Gross margin ${fmtPctFn(reportData?.grossMargin || 0)}` },
    { label: "Operating Expenses", isSection: true },
    ...expenseEntries.map(([category, amount]) => ({
      label: category,
      amount: -amount,
      percent: revenue > 0 ? -amount / revenue : 0,
      tone: "text-zinc-300",
      indent: true,
    })),
    ...(expenseEntries.length > 0 ? [{ label: "Total operating expenses", amount: -totalOpex, percent: revenue > 0 ? -totalOpex / revenue : 0, tone: "text-red-400", isSub: true }] : []),
    { label: "Net Profit", amount: netProfit, percent: revenue > 0 ? netProfit / revenue : 0, tone: netProfit >= 0 ? "text-emerald-400" : "text-red-400", isTotal: true, subLabel: `Net margin ${fmtPctFn(reportData?.netMargin || 0)}` },
  ]
}

function buildMetricCards(reportData, fmtFn, fmtPctFn) {
  return [
    { label: "Revenue", value: fmtFn(reportData?.revenue || 0), color: "text-white" },
    { label: "Gross margin", value: fmtPctFn(reportData?.grossMargin || 0), color: (reportData?.grossMargin || 0) >= 0 ? "text-emerald-400" : "text-red-400" },
    { label: "Net margin", value: fmtPctFn(reportData?.netMargin || 0), color: (reportData?.netMargin || 0) >= 0 ? "text-emerald-400" : "text-red-400" },
    { label: "Operating expenses", value: fmtFn(reportData?.totalOpex || 0), color: "text-zinc-300", sub: "Grouped by expense category" },
  ]
}

function buildWaterfall(reportData) {
  const revenue = reportData?.revenue || 0
  const grossProfit = reportData?.grossProfit || 0
  const netProfit = reportData?.netProfit || 0

  return [
    { label: "Revenue", value: revenue, percent: revenue > 0 ? 1 : 0, color: "text-emerald-400", fill: "var(--accent)" },
    { label: "After COGS", value: grossProfit, percent: revenue > 0 ? grossProfit / revenue : 0, color: "text-blue-400", fill: "var(--blue)" },
    { label: "After opex", value: netProfit, percent: revenue > 0 ? netProfit / revenue : 0, color: "text-amber-400", fill: "var(--amber)" },
  ]
}

function formatCurrency(amount) {
  return `KES ${Math.abs(Number(amount || 0)).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
}

function formatPercent(ratio) {
  return `${Number(ratio || 0).toFixed(1)}%`
}
