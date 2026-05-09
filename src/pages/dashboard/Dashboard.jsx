// src/pages/dashboard/Dashboard.jsx
import { useMemo } from "react"
import FloatingBottomNav from "../../components/layout/FloatingBottomNav"
import { AppShell, UiButton } from "../../components/ui"
import { useInstantNavigation } from "../../hooks/useInstantNavigation"
import { useBranchContext } from "../../context/BranchContext"
import { BranchSelector } from "../../components/BranchSelector"
import { useDashboardContext } from "../../features/dashboard/hooks/useDashboardContext"
import { useTodayActivity } from "../../features/dashboard/hooks/useTodayActivity"
import { useProducts } from "../../hooks/useProducts"

function KpiCard({ label, value, tone = "neutral", subtext }) {
  const toneClass = {
    neutral: "border-zinc-800 bg-zinc-900/70",
    positive: "border-emerald-500/20 bg-emerald-500/5",
    warning: "border-amber-500/20 bg-amber-500/5",
    danger: "border-red-500/20 bg-red-500/5",
  }[tone]

  const valueClass = {
    neutral: "text-white",
    positive: "text-emerald-400",
    warning: "text-amber-400",
    danger: "text-red-400",
  }[tone]

  return (
    <div className={`rounded-2xl border p-4 shadow-lg shadow-black/10 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">{label}</p>
      <p className={`mt-2 text-lg sm:text-xl font-semibold tracking-tight ${valueClass}`}>{value}</p>
      {subtext ? <p className="mt-1 text-xs text-zinc-500">{subtext}</p> : null}
    </div>
  )
}

function QuickActions({ isOwnerOrManager, navigateInstant }) {
  return (
    <div className="flex flex-wrap gap-2">
      <UiButton variant="primary" size="sm" onClick={() => navigateInstant("/transactions/add-sale")}>
        + Sale
      </UiButton>
      {isOwnerOrManager && (
        <UiButton variant="secondary" size="sm" onClick={() => navigateInstant("/transactions/add-expense")}>
          + Expense
        </UiButton>
      )}
    </div>
  )
}

function TodayReport({ todayTransactions, todaySummary, fmt }) {
  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-lg shadow-black/10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm">Today's activity</h3>
          <p className="text-zinc-500 text-xs mt-1">Sales and expenses recorded today</p>
        </div>
        <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] font-medium text-zinc-400">
          Live
        </span>
      </div>
      {todayTransactions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 px-4 py-6 text-center">
          <p className="text-white text-sm font-medium">No activity yet today</p>
          <p className="text-zinc-500 text-xs mt-1">New sales and expenses will appear here as they are recorded.</p>
        </div>
      ) : null}
      {todayTransactions.map((t, i) => (
        <div key={i} className="py-2 border-b border-zinc-800 last:border-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-zinc-500 text-xs">
              {new Date(t.date).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })} · {t.payment_account === "mpesa" ? "M-Pesa" : t.payment_account}
            </p>
          </div>
          {t.type === "sale" && t.sale_items?.length > 0 ? (
            <table className="w-full">
              <tbody>
                {t.sale_items.map((item, j) => (
                  <tr key={j}>
                    <td className="text-white text-xs py-0.5">{item.products?.name}</td>
                    <td className="text-zinc-500 text-xs py-0.5 text-right font-mono">{fmt(item.unit_price)}</td>
                    <td className="text-zinc-500 text-xs py-0.5 text-right px-2">×{item.quantity}</td>
                    <td className="text-zinc-400 text-xs py-0.5 text-right font-mono">{fmt(item.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : t.type === "expense" && t.expense ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-zinc-400 text-xs">{t.expense.category}</p>
                <p className="text-zinc-300 text-xs font-mono">{fmt(t.expense.amount)}</p>
              </div>
            </div>
          ) : null}
        </div>
      ))}
      <div className="pt-2 border-t border-zinc-800 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-zinc-500 text-xs">Sales</p>
          <p className="text-emerald-400 text-xs font-mono">{fmt(todaySummary?.totalSales || 0)}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-zinc-500 text-xs">Expenses</p>
          <p className="text-red-400 text-xs font-mono">{fmt(todaySummary?.totalExpenses || 0)}</p>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
          <p className="text-zinc-400 text-xs font-semibold">Net</p>
          <p className={`text-xs font-mono font-semibold ${(todaySummary?.net || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmt(todaySummary?.net || 0)}
          </p>
        </div>
      </div>
    </div>
  )
}

function BusinessInsights({ lowStockProducts, topSeller, attentionLabel, fmt }) {
  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-lg shadow-black/10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm">Action needed</h3>
          <p className="text-zinc-500 text-xs mt-1">Quick signals that need attention</p>
        </div>
        <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] font-medium text-zinc-400">
          Action needed
        </span>
      </div>

      <div className="space-y-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-zinc-400 text-xs uppercase tracking-wide">Low stock</p>
              <p className="text-white text-sm font-medium mt-1">
                {lowStockProducts.length > 0
                  ? `${lowStockProducts.length} item${lowStockProducts.length === 1 ? "" : "s"} below threshold`
                  : "No low stock alerts"}
              </p>
            </div>
            <span className={`text-xs font-mono ${lowStockProducts.length > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {lowStockProducts.length > 0 ? "Check" : "OK"}
            </span>
          </div>
          {lowStockProducts.length > 0 ? (
            <p className="text-zinc-500 text-xs mt-2">
              {lowStockProducts
                .slice(0, 2)
                .map((product) => `${product.name} (${product.current_quantity || 0})`)
                .join(", ")}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-zinc-400 text-xs uppercase tracking-wide">Top seller</p>
              <p className="text-white text-sm font-medium mt-1">
                {topSeller ? topSeller.name : "No sales yet"}
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400">
              {topSeller ? `${topSeller.qty} sold` : "—"}
            </span>
          </div>
          {topSeller ? (
            <p className="text-zinc-500 text-xs mt-2">
              {fmt(topSeller.value)} value today
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-zinc-400 text-xs uppercase tracking-wide">Pending issue</p>
              <p className="text-white text-sm font-medium mt-1">
                {attentionLabel}
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-400">Now</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardLoading() {
  return (
    <AppShell>
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-zinc-400">Loading dashboard...</p>
      </div>
    </AppShell>
  )
}

function DashboardAccessIssue({ issue }) {
  return (
    <AppShell>
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-zinc-400 mb-2">Dashboard access issue</p>
          <p className="text-zinc-500 text-sm">{issue}</p>
        </div>
      </div>
    </AppShell>
  )
}

export default function Dashboard() {
  const { navigateInstant } = useInstantNavigation()
  const { canViewAll, activeBranch, viewMode } = useBranchContext()
  
  // Single source of truth for auth/business/branch state
  const { business, branchId, loading, accessIssue } = useDashboardContext()

  const { products, loading: productsLoading } = useProducts(
    canViewAll ? null : branchId,
    canViewAll
  )
  
  // Domain-specific hooks - pass dashboard context to prevent duplicate subscriptions
  const { todayTransactions, todaySummary, error: todayError } = useTodayActivity({ business })

  const lowStockProducts = useMemo(() => {
    const threshold = Number(business?.low_stock_threshold ?? 10)

    return (products || [])
      .filter((product) => Number(product.current_quantity || 0) <= threshold)
      .sort((a, b) => Number(a.current_quantity || 0) - Number(b.current_quantity || 0))
      .slice(0, 3)
  }, [business?.low_stock_threshold, products])

  const topSeller = useMemo(() => {
    const sales = new Map()

    todayTransactions.forEach((transaction) => {
      if (transaction.type !== "sale") return

      transaction.sale_items?.forEach((item) => {
        const name = item.products?.name || item.product_name || "Product"
        const quantity = Number(item.quantity || 0)
        const value = Number(item.total_amount || item.unit_price || 0)
        const current = sales.get(name) || { name, qty: 0, value: 0 }

        current.qty += quantity
        current.value += value
        sales.set(name, current)
      })
    })

    return [...sales.values()].sort((a, b) => b.qty - a.qty || b.value - a.value)[0] || null
  }, [todayTransactions])

  const attentionLabel = useMemo(() => {
    if (productsLoading) {
      return "Checking stock levels..."
    }

    if (lowStockProducts.length > 0) {
      return `${lowStockProducts.length} product${lowStockProducts.length === 1 ? "" : "s"} need restocking`
    }

    if ((todaySummary?.net || 0) < 0) {
      return "Net is negative today"
    }

    if (todayTransactions.length === 0) {
      return "No activity recorded yet"
    }

    return "No urgent issues"
  }, [lowStockProducts.length, productsLoading, todaySummary?.net, todayTransactions.length])

  const fmt = (num) => {
    if (num === null || num === undefined) return "0.00"
    return Number(num || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const kpis = [
    {
      label: "Today sales",
      value: fmt(todaySummary?.totalSales || 0),
      tone: "positive",
      subtext: todayTransactions.length ? `${todayTransactions.length} transaction${todayTransactions.length === 1 ? "" : "s"}` : "No activity yet",
    },
    {
      label: "Today expenses",
      value: fmt(todaySummary?.totalExpenses || 0),
      tone: Number(todaySummary?.totalExpenses || 0) > 0 ? "danger" : "neutral",
      subtext: Number(todaySummary?.totalExpenses || 0) > 0 ? "Money out today" : "No expenses recorded",
    },
    {
      label: "Net position",
      value: fmt(todaySummary?.net || 0),
      tone: Number(todaySummary?.net || 0) >= 0 ? "positive" : "danger",
      subtext: Number(todaySummary?.net || 0) >= 0 ? "Positive day" : "Needs attention",
    },
    {
      label: "Low stock",
      value: String(lowStockProducts.length),
      tone: lowStockProducts.length > 0 ? "warning" : "neutral",
      subtext: lowStockProducts.length > 0 ? "Items below threshold" : "Stock levels look fine",
    },
  ]

  // Loading and access states
  if (loading) return <DashboardLoading />
  if (accessIssue) return <DashboardAccessIssue issue={accessIssue} />
  
  // Error states
  const dashboardError = todayError
  if (dashboardError) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-zinc-400 mb-2">Failed to load dashboard data</p>
            <p className="text-zinc-500 text-sm">{dashboardError.message || 'Unknown error'}</p>
          </div>
        </div>
      </AppShell>
    )
  }

  const isOwnerOrManager = canViewAll

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900/95 via-zinc-900/85 to-zinc-950 p-4 sm:p-5 shadow-lg shadow-black/10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Store</p>
              <h1 className="mt-1 text-white text-2xl sm:text-3xl font-semibold tracking-tight">Dashboard</h1>
              <p className="mt-2 text-zinc-400 text-sm sm:text-base">{business?.name}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {activeBranch && (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                    {activeBranch.name}
                  </span>
                )}
                {!isOwnerOrManager && viewMode === "all" && !activeBranch && (
                  <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[10px] font-medium text-amber-400">
                    No branch assigned
                  </span>
                )}
                {isOwnerOrManager && viewMode === "all" && !activeBranch && (
                  <span className="inline-flex items-center rounded-full bg-zinc-800 border border-zinc-700 px-2.5 py-1 text-[10px] font-medium text-zinc-400">
                    All branches
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              {canViewAll ? <BranchSelector /> : null}
              <UiButton variant="tertiary" size="sm" onClick={() => navigateInstant("/")} className="text-zinc-400 hover:text-red-400">
                Sign out
              </UiButton>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Quick actions</p>
                <p className="text-xs text-zinc-500 mt-1">Common tasks for this branch</p>
              </div>
            </div>
            <QuickActions isOwnerOrManager={isOwnerOrManager} navigateInstant={navigateInstant} />
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5 shadow-lg shadow-black/10">
          <div className="flex items-end justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">At a glance</p>
              <h2 className="mt-1 text-white text-sm font-semibold">Today’s snapshot</h2>
            </div>
            <p className="text-zinc-500 text-xs">Updated in real time</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <KpiCard key={kpi.label} {...kpi} />
            ))}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <TodayReport
            todayTransactions={todayTransactions}
            todaySummary={todaySummary}
            fmt={fmt}
          />

          <BusinessInsights
            lowStockProducts={lowStockProducts}
            topSeller={topSeller}
            attentionLabel={attentionLabel}
            fmt={fmt}
          />
        </div>
      </div>

      <FloatingBottomNav />
    </AppShell>
  )
}
