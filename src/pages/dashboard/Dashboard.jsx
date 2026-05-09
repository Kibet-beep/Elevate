// src/pages/dashboard/Dashboard.jsx
import { useMemo } from "react"
import FloatingBottomNav from "../../components/layout/FloatingBottomNav"
import { AppShell, UiButton } from "../../components/ui"
import { useInstantNavigation } from "../../hooks/useInstantNavigation"
import { useBranchContext } from "../../context/BranchContext"
import { BranchSelector } from "../../components/BranchSelector"
import { useDashboardContext } from "../../features/dashboard/hooks/useDashboardContext"
import { useTodayActivity } from "../../features/dashboard/hooks/useTodayActivity"
import { usePeriodActivity } from "../../features/dashboard/hooks/usePeriodActivity"
import { buildPendingActions } from "../../features/dashboard/utils/dashboard.transforms"

// Constants moved to feature layer
const WEEK_DAYS = ["All", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const OWNER_PERIODS = ["Week", "Month"]

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

function TodayReport({ todayTransactions, todaySummary, pendingActions, fmt }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
      <h3 className="text-white font-semibold text-sm">Today's activity</h3>
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
  const { business, loading, accessIssue } = useDashboardContext()
  
  // Domain-specific hooks - pass dashboard context to prevent duplicate subscriptions
  const { todayTransactions, todaySummary, error: todayError } = useTodayActivity({ business })
  const {
    period,
    setPeriod,
    selectedDay,
    setSelectedDay,
    periodTransactions,
    periodSummary,
    loading: periodLoading,
    error: periodError,
  } = usePeriodActivity({ business })

  // Computed values
  const pendingActions = useMemo(
    () => buildPendingActions(todayTransactions),
    [todayTransactions]
  )

  const fmt = (num) => {
    if (num === null || num === undefined) return "0.00"
    return Number(num || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Loading and access states
  if (loading) return <DashboardLoading />
  if (accessIssue) return <DashboardAccessIssue issue={accessIssue} />
  
  // Error states
  const dashboardError = todayError || periodError
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
      {/* Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5 shadow-lg shadow-black/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Store</p>
            <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">Dashboard</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-zinc-400 text-xs sm:text-sm">
                {business?.name}
              </p>
              {activeBranch && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium">
                  {activeBranch.name}
                </span>
              )}
              {!isOwnerOrManager && viewMode === 'all' && !activeBranch && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium">
                  No branch assigned
                </span>
              )}
              {isOwnerOrManager && viewMode === 'all' && !activeBranch && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-medium">
                  All branches
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canViewAll ? (
              <BranchSelector />
            ) : null}
            <UiButton variant="tertiary" size="sm" onClick={() => navigateInstant("/")} className="text-zinc-400 hover:text-red-400">
              Sign out
            </UiButton>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-lg shadow-black/10">
        <QuickActions isOwnerOrManager={isOwnerOrManager} navigateInstant={navigateInstant} />
      </div>

      {/* Today Report */}
      <TodayReport
        todayTransactions={todayTransactions}
        todaySummary={todaySummary}
        pendingActions={pendingActions}
        fmt={fmt}
      />

      {/* Period Activity - simplified for now */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <h3 className="text-white font-semibold text-sm mb-3">Period Activity</h3>
        <div className="flex gap-2 mb-4">
          {OWNER_PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-emerald-500 text-black'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        {periodLoading ? (
          <p className="text-zinc-400 text-sm">Loading...</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-zinc-500 text-xs">Sales</p>
              <p className="text-emerald-400 text-xs font-mono">{fmt(periodSummary?.totalSales || 0)}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-zinc-500 text-xs">Expenses</p>
              <p className="text-red-400 text-xs font-mono">{fmt(periodSummary?.totalExpenses || 0)}</p>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
              <p className="text-zinc-400 text-xs font-semibold">Net</p>
              <p className={`text-xs font-mono font-semibold ${(periodSummary?.net || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmt(periodSummary?.net || 0)}
              </p>
            </div>
          </div>
        )}
      </div>

      <FloatingBottomNav />
    </AppShell>
  )
}
