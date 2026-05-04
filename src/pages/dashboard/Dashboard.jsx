// src/pages/dashboard/Dashboard.jsx
import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import FloatingBottomNav from "../../components/layout/FloatingBottomNav"
import { AppShell, UiButton } from "../../components/ui"
import { useUser, useIsOwnerOrManager, useIsCashier } from "../../hooks/useRole"
import { usePreloadData } from "../../hooks/useCache"
import { useInstantNavigation } from "../../hooks/useInstantNavigation"
import { useInstantAuth } from "../../hooks/useInstantAuth"
import { useBranchContext } from "../../hooks/useBranchContext"
import { BranchSelector } from "../../components/BranchSelector"

const WEEK_DAYS = ["All", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const OWNER_PERIODS = ["Week", "Month"]
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000

export default function Dashboard() {
  const navigate = useNavigate()
  const { user: authUser } = useUser()
  const { user: instantUser, business: instantBusiness } = useInstantAuth()
  const { navigateInstant } = useInstantNavigation()
  const { preloadTransactions, preloadProducts, preloadEmployees, preloadBusiness } = usePreloadData()
  const isOwnerOrManager = useIsOwnerOrManager()
  const isCashier = useIsCashier()
  const { currentBranchId, viewMode, canViewAll, activeBranch } = useBranchContext()
  const [business, setBusiness] = useState(null)
  const [stats, setStats] = useState({
    todaySales: 0,
    totalRevenue: 0,
    transactions: 0,
    lowStock: 0,
  })
  const [period, setPeriod] = useState("Week")
  const [selectedDay, setSelectedDay] = useState("All")
  const [periodTransactions, setPeriodTransactions] = useState([])
  const [todayTransactions, setTodayTransactions] = useState([])
  const [periodSummary, setPeriodSummary] = useState({
    totalSales: 0, totalExpenses: 0, net: 0, cash: 0, mpesa: 0, bank: 0,
  })
  const [todaySummary, setTodaySummary] = useState({
    totalSales: 0, totalExpenses: 0, net: 0, cash: 0, mpesa: 0,
  })
  const [lowStockItems, setLowStockItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodLoading, setPeriodLoading] = useState(false)
  const [accessIssue, setAccessIssue] = useState("")

  const setBusinessFromProfile = (profile, fallbackBusiness) => {
    const resolvedBusiness = fallbackBusiness || profile?.businesses || null
    if (!resolvedBusiness) return null

    const nextBusiness = {
      ...resolvedBusiness,
      userName: profile?.full_name || resolvedBusiness.userName || "",
    }
    setBusiness(nextBusiness)
    return nextBusiness
  }

  // Use instant auth data if available
  useEffect(() => {
    if (instantUser && instantBusiness) {
      setBusiness({ ...instantBusiness, userName: instantUser.full_name })
      setLoading(false)
      
      // Preload related data
      preloadTransactions(instantBusiness.id)
      preloadProducts(instantBusiness.id)
      preloadEmployees(instantBusiness.id)
      preloadBusiness(instantBusiness.id)
    } else if (authUser) {
      fetchDashboardData()
    }
  }, [instantUser, instantBusiness, authUser])

  useEffect(() => { if (business) fetchPeriodData() }, [period, selectedDay, business, currentBranchId, viewMode])
  useEffect(() => { if (business) fetchTodayData() }, [business, currentBranchId, viewMode])
  useEffect(() => { if (business) fetchDashboardData() }, [business?.id, currentBranchId, viewMode])

  const getEATNow = () => new Date(Date.now() + EAT_OFFSET_MS)

  const toUtcIsoFromEAT = (eatDate) => new Date(eatDate.getTime() - EAT_OFFSET_MS).toISOString()

  const getTodayStartUtcIsoEAT = () => {
    const start = getEATNow()
    start.setUTCHours(0, 0, 0, 0)
    return toUtcIsoFromEAT(start)
  }

  const getWeekRange = () => {
    const nowEAT = getEATNow()
    const day = nowEAT.getUTCDay()
    const daysSinceMonday = (day + 6) % 7
    const start = new Date(nowEAT)
    start.setUTCDate(nowEAT.getUTCDate() - daysSinceMonday)
    start.setUTCHours(0, 0, 0, 0)
    return { start: toUtcIsoFromEAT(start), end: new Date().toISOString() }
  }

  const getSelectedDayRange = () => {
    const nowEAT = getEATNow()
    const day = nowEAT.getUTCDay()
    const daysSinceMonday = (day + 6) % 7
    const weekStart = new Date(nowEAT)
    weekStart.setUTCDate(nowEAT.getUTCDate() - daysSinceMonday)
    weekStart.setUTCHours(0, 0, 0, 0)

    const dayIndex = WEEK_DAYS.indexOf(selectedDay) - 1
    const start = new Date(weekStart)
    start.setUTCDate(weekStart.getUTCDate() + dayIndex)
    start.setUTCHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setUTCHours(23, 59, 59, 999)
    return { start: toUtcIsoFromEAT(start), end: toUtcIsoFromEAT(end) }
  }

  const getPeriodRange = () => {
    const now = new Date()
    const start = getEATNow()
    start.setUTCHours(0, 0, 0, 0)

    if (period === "Week") {
      if (selectedDay !== "All") return getSelectedDayRange()
      return getWeekRange()
    } else if (period === "Month") {
      start.setUTCDate(1)
      start.setUTCHours(0, 0, 0, 0)
    }
    return { start: toUtcIsoFromEAT(start), end: now.toISOString() }
  }

  const fetchDashboardData = async () => {
    if (!authUser) {
      setLoading(false)
      return
    }

    setAccessIssue("")

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("business_id, full_name, businesses(*)")
      .eq("id", authUser.id)
      .maybeSingle()

    if (userError || !userData) {
      setAccessIssue("Your account is signed in, but profile setup is incomplete. Please sign out and sign in again.")
      setLoading(false)
      return
    }

    const resolvedBusiness = setBusinessFromProfile(userData, userData.businesses)
    if (!resolvedBusiness) {
      setAccessIssue("Your business profile is missing. Please contact support or complete onboarding.")
      setLoading(false)
      return
    }

    const todayStart = getTodayStartUtcIsoEAT()
    const businessId = userData.business_id
    const branchFilter = viewMode === 'branch' && currentBranchId ? currentBranchId : null

    const todayTxnsQuery = supabase
      .from("transactions")
      .select("id, branch_id, date, sale_items(total_amount)")
      .eq("business_id", businessId)
      .eq("type", "sale")
      .gte("date", todayStart)

    const allTxnsQuery = supabase
      .from("transactions")
      .select("id, branch_id, sale_items(total_amount)")
      .eq("business_id", businessId)
      .eq("type", "sale")

    const lowStockQuery = supabase
      .from("products")
      .select("id, branch_id, name, current_quantity, reorder_point")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .limit(100)

    if (branchFilter) {
      todayTxnsQuery.eq("branch_id", branchFilter)
      allTxnsQuery.eq("branch_id", branchFilter)
      lowStockQuery.eq("branch_id", branchFilter)
    }

    const [todayTxnsResult, allTxnsResult, lowStockResult] = await Promise.all([
      todayTxnsQuery,
      allTxnsQuery,
      lowStockQuery,
    ])

    const todayTxns = todayTxnsResult?.data || []
    const allTxns = allTxnsResult?.data || []
    const lowStock = lowStockResult?.data || []

    const todaySales = todayTxns.reduce((sum, t) =>
      sum + (t.sale_items?.reduce((s, i) => s + i.total_amount, 0) || 0), 0) || 0

    const totalRevenue = allTxns.reduce((sum, t) =>
      sum + (t.sale_items?.reduce((s, i) => s + i.total_amount, 0) || 0), 0) || 0

    const filteredLowStock = (lowStock || [])
      .filter(p => p.current_quantity <= p.reorder_point)
      .slice(0, 5)

    setLowStockItems(filteredLowStock)
    setStats({
      todaySales,
      totalRevenue,
      transactions: todayTxns.length || 0,
      lowStock: filteredLowStock.length,
    })

    setLoading(false)
  }

  const fetchTodayData = async () => {
    if (!business?.id) return

    const todayStart = getTodayStartUtcIsoEAT()
    const businessId = business.id

    // Build base queries
    const baseTxnQuery = supabase
      .from("transactions")
      .select(`id, type, payment_account, date,
        sale_items(total_amount, quantity, unit_price, products(name)),
        expenses(amount, category)`)
      .eq("business_id", businessId)
      .gte("date", todayStart)
      .order("date", { ascending: true })

    const baseAllTxnQuery = supabase
      .from("transactions")
      .select("type, payment_account, sale_items(total_amount), expenses(amount)")
      .eq("business_id", businessId)

    // Apply branch filtering if in branch mode
    if (viewMode === 'branch' && currentBranchId) {
      baseTxnQuery.eq("branch_id", currentBranchId)
      baseAllTxnQuery.eq("branch_id", currentBranchId)
    }

    const [txnsResult, floatResult, allTxnsResult, transfersResult] = await Promise.all([
      baseTxnQuery,
      supabase
        .from("float_baseline")
        .select("*")
        .eq("business_id", businessId)
        .maybeSingle(),
      baseAllTxnQuery,
      supabase
        .from("transfers")
        .select("*")
        .eq("business_id", businessId),
    ])

    const txns = txnsResult?.data || []
    const floatData = floatResult?.data || null
    const allTxns = allTxnsResult?.data || []
    const transfers = transfersResult?.data || []

    const enriched = txns.map(t => {
      if (t.type === "sale") {
        const amount = t.sale_items?.reduce((s, i) => s + i.total_amount, 0) || 0
        const name = t.sale_items?.length > 1
          ? `${t.sale_items[0].products?.name} +${t.sale_items.length - 1} more`
          : t.sale_items?.[0]?.products?.name || "Sale"
        return { ...t, amount, display_name: name }
      } else {
        const amount = t.expenses?.reduce((s, e) => s + e.amount, 0) || 0
        const name = t.expenses?.[0]?.category || "Expense"
        return { ...t, amount, display_name: name }
      }
    })

    setTodayTransactions(enriched)

    const todaySales = enriched.filter(t => t.type === "sale").reduce((s, t) => s + t.amount, 0)
    const todayExpenses = enriched.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)

    const calc = (account) => {
      const opening = floatData?.[`${account}_opening`] || 0
      const salesIn = (allTxns || [])
        .filter(t => t.type === "sale" && t.payment_account === account)
        .reduce((s, t) => s + (t.sale_items?.reduce((a, i) => a + i.total_amount, 0) || 0), 0)
      const expOut = (allTxns || [])
        .filter(t => t.type === "expense" && t.payment_account === account)
        .reduce((s, t) => s + (t.expenses?.reduce((a, e) => a + e.amount, 0) || 0), 0)
      const transferOut = (transfers || [])
        .filter(t => t.from_account === account)
        .reduce((s, t) => s + t.amount + t.transaction_cost, 0)
      const transferIn = (transfers || [])
        .filter(t => t.to_account === account)
        .reduce((s, t) => s + t.amount, 0)
      return opening + salesIn - expOut - transferOut + transferIn
    }

    setTodaySummary({
      totalSales: todaySales,
      totalExpenses: todayExpenses,
      net: todaySales - todayExpenses,
      cash: calc("cash"),
      mpesa: calc("mpesa"),
    })
  }

  const fetchPeriodData = async () => {
    if (!business?.id) return

    setPeriodLoading(true)
    const businessId = business.id
    const { start, end } = getPeriodRange()

    const [txnsResult, floatResult, allTxnsResult, transfersResult] = await Promise.all([
      supabase
        .from("transactions")
        .select(`id, type, payment_account, date,
          sale_items(total_amount, products(name)),
          expenses(amount, category)`)
        .eq("business_id", businessId)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false }),
      supabase
        .from("float_baseline")
        .select("*")
        .eq("business_id", businessId)
        .maybeSingle(),
      supabase
        .from("transactions")
        .select("type, payment_account, sale_items(total_amount), expenses(amount)")
        .eq("business_id", businessId),
      supabase
        .from("transfers")
        .select("*")
        .eq("business_id", businessId),
    ])

    const txns = txnsResult?.data || []
    const floatData = floatResult?.data || null
    const allTxns = allTxnsResult?.data || []
    const transfers = transfersResult?.data || []

    const enriched = txns.map(t => {
      if (t.type === "sale") {
        const amount = t.sale_items?.reduce((s, i) => s + i.total_amount, 0) || 0
        const name = t.sale_items?.length > 1
          ? `${t.sale_items[0].products?.name} +${t.sale_items.length - 1} more`
          : t.sale_items?.[0]?.products?.name || "Sale"
        return { ...t, amount, display_name: name }
      } else {
        const amount = t.expenses?.reduce((s, e) => s + e.amount, 0) || 0
        const name = t.expenses?.[0]?.category || "Expense"
        return { ...t, amount, display_name: name }
      }
    })

    setPeriodTransactions(enriched)

    const totalSales = enriched.filter(t => t.type === "sale").reduce((s, t) => s + t.amount, 0)
    const totalExpenses = enriched.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)

    const calc = (account) => {
      const opening = floatData?.[`${account}_opening`] || 0
      const salesIn = (allTxns || [])
        .filter(t => t.type === "sale" && t.payment_account === account)
        .reduce((s, t) => s + (t.sale_items?.reduce((a, i) => a + i.total_amount, 0) || 0), 0)
      const expOut = (allTxns || [])
        .filter(t => t.type === "expense" && t.payment_account === account)
        .reduce((s, t) => s + (t.expenses?.reduce((a, e) => a + e.amount, 0) || 0), 0)
      const transferOut = (transfers || [])
        .filter(t => t.from_account === account)
        .reduce((s, t) => s + t.amount + t.transaction_cost, 0)
      const transferIn = (transfers || [])
        .filter(t => t.to_account === account)
        .reduce((s, t) => s + t.amount, 0)
      return opening + salesIn - expOut - transferOut + transferIn
    }

    setPeriodSummary({
      totalSales,
      totalExpenses,
      net: totalSales - totalExpenses,
      cash: calc("cash"),
      mpesa: calc("mpesa"),
      bank: calc("bank"),
    })

    setPeriodLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigateInstant("/")
  }

  const fmt = (n) => `KES ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`

  const QuickActions = () => (
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

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <p className="text-zinc-500 text-sm">Loading...</p>
    </div>
  )

  if (accessIssue) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-5">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-white text-xl font-semibold">Account setup required</h2>
            <p className="text-zinc-400 text-sm mt-2">{accessIssue}</p>
          </div>
          <UiButton variant="primary" className="w-full" onClick={handleSignOut}>
            Sign out
          </UiButton>
        </div>
      </div>
    )
  }

  // ── SHARED TODAY COMPONENT ──
  const TodayReport = () => (
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
                    <td className="text-emerald-400 text-xs py-0.5 text-right font-mono">{fmt(item.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-white text-sm">{t.display_name}</p>
          )}
        </div>
      ))}

      <div className="border-t border-zinc-800 pt-3 space-y-2">
        <div className="flex justify-between">
          <p className="text-zinc-400 text-sm">Today's sales</p>
          <p className="text-emerald-400 text-sm font-mono">{fmt(todaySummary.totalSales)}</p>
        </div>
        <div className="flex justify-between">
          <p className="text-zinc-400 text-sm">Today's expenses</p>
          <p className="text-red-400 text-sm font-mono">-{fmt(todaySummary.totalExpenses)}</p>
        </div>
        <div className="flex justify-between border-t border-zinc-800 pt-2">
          <p className="text-white font-semibold text-sm">Net today</p>
          <p className={`text-sm font-mono font-bold ${todaySummary.net >= 0 ? "text-white" : "text-red-400"}`}>
            {fmt(todaySummary.net)}
          </p>
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-3">
        <p className="text-zinc-500 text-xs mb-3">Current balances (accumulated)</p>
        <div className="space-y-2">
          {[
            { label: "💵 Cash in hand", value: todaySummary.cash },
            { label: "📱 M-Pesa", value: todaySummary.mpesa },
          ].map((acc, i) => (
            <div key={i} className="flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-3">
              <p className="text-zinc-300 text-sm">{acc.label}</p>
              <p className={`text-sm font-mono font-bold ${acc.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {fmt(acc.value)}
              </p>
            </div>
          ))}
          <div className="flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-3 border border-zinc-700">
            <p className="text-white font-semibold text-sm">Total</p>
            <p className="text-emerald-400 text-sm font-mono font-bold">
              {fmt(todaySummary.cash + todaySummary.mpesa)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  // ── CASHIER VIEW ──
  if (isCashier) {
    return (
      <AppShell
        title="Elevate"
        subtitle={business?.name}
        className="pb-28"
        showHeader={false}
        contentClassName="max-w-lg space-y-4"
        right={(
          <>
            <UiButton variant="tertiary" size="sm" onClick={handleSignOut} className="text-zinc-500 hover:text-red-400">
              Sign out
            </UiButton>
          </>
        )}
      >
          <div>
            <h2 className="text-white text-xl font-bold">Good {getGreeting()}, {business?.userName?.split(" ")[0]}</h2>
            <p className="text-zinc-500 text-sm mt-1">
              {new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <QuickActions />
          <TodayReport />

        <FloatingBottomNav
          activePath="/dashboard"
          itemClassName="px-6 py-2.5"
          items={[
            { label: "Dashboard", path: "/dashboard" },
            { label: "Transactions", path: "/transactions" },
          ]}
        />
      </AppShell>
    )
  }

  // ── OWNER / MANAGER VIEW ──
  return (
    <AppShell
      title="Elevate"
      subtitle={`${business?.name}${viewMode === 'branch' && activeBranch ? ` • ${activeBranch.name}` : ''}`}
      className="pb-28"
      showHeader={true}
      contentClassName="max-w-5xl space-y-6"
      right={(
        <div className="flex items-center gap-3">
          <BranchSelector />
          <UiButton variant="tertiary" size="sm" onClick={handleSignOut} className="text-zinc-500 hover:text-red-400">
            Sign out
          </UiButton>
        </div>
      )}
    >

        <div>
          <h2 className="text-white text-2xl font-bold">Good {getGreeting()}, {business?.userName?.split(" ")[0]}</h2>
          <p className="text-zinc-500 text-sm mt-1">
            {new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <QuickActions />

        {stats.totalRevenue === 0 && stats.lowStock === 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-emerald-400 font-medium text-sm">Set up your inventory</p>
              <p className="text-zinc-400 text-xs mt-0.5">Add your products to start tracking stock and sales</p>
            </div>
            <button
              onClick={() => navigateInstant("/inventory")}
              className="bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              Go to Inventory
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Today's sales", value: fmt(stats.todaySales), accent: "emerald" },
            { label: "Total revenue", value: fmt(stats.totalRevenue), accent: "emerald" },
            { label: "Transactions today", value: stats.transactions, accent: "blue" },
            { label: "Low stock alerts", value: stats.lowStock, accent: stats.lowStock > 0 ? "red" : "zinc" },
          ].map((s, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <p className="text-zinc-500 text-xs mb-2">{s.label}</p>
              <p className={`text-xl font-bold font-mono ${
                s.accent === "emerald" ? "text-emerald-400" :
                s.accent === "blue" ? "text-blue-400" :
                s.accent === "red" ? "text-red-400" : "text-white"
              }`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Today report */}
        <TodayReport />

        {/* Period filter */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">Activity</h3>
            <div className="flex gap-1">
              {OWNER_PERIODS.map(p => (
                <button key={p} onClick={() => { setPeriod(p); setSelectedDay("All") }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    period === p ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Week day drill-down */}
          {period === "Week" && (
            <div className="flex gap-1 overflow-x-auto pb-1">
              {WEEK_DAYS.map(d => (
                <button key={d} onClick={() => setSelectedDay(d)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    selectedDay === d ? "bg-zinc-600 text-white" : "bg-zinc-800 text-zinc-500 hover:text-white"
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          )}

          {periodLoading ? (
            <p className="text-zinc-600 text-sm text-center py-6">Loading...</p>
          ) : (
            <>
              {periodTransactions.length === 0 ? (
                <p className="text-zinc-600 text-sm text-center py-6">No activity for this period</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {periodTransactions.map((t, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          t.type === "sale" ? "bg-emerald-500/10" : "bg-red-400/10"
                        }`}>
                          <span className="text-xs">{t.type === "sale" ? "↑" : "↓"}</span>
                        </div>
                        <div>
                          <p className="text-white text-sm">{t.display_name}</p>
                          <p className="text-zinc-500 text-xs">
                            {new Date(t.date).toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" })} · {new Date(t.date).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })} · {t.payment_account === "mpesa" ? "M-Pesa" : t.payment_account}
                          </p>
                        </div>
                      </div>
                      <p className={`text-sm font-mono font-medium ${
                        t.type === "sale" ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {t.type === "sale" ? "+" : "-"}{fmt(t.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-zinc-800 pt-4 space-y-2">
                <div className="flex justify-between">
                  <p className="text-zinc-400 text-sm">Total sales</p>
                  <p className="text-emerald-400 text-sm font-mono">{fmt(periodSummary.totalSales)}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-zinc-400 text-sm">Total expenses</p>
                  <p className="text-red-400 text-sm font-mono">-{fmt(periodSummary.totalExpenses)}</p>
                </div>
                <div className="flex justify-between border-t border-zinc-800 pt-2">
                  <p className="text-white font-semibold text-sm">Net</p>
                  <p className={`text-sm font-mono font-bold ${periodSummary.net >= 0 ? "text-white" : "text-red-400"}`}>
                    {fmt(periodSummary.net)}
                  </p>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <p className="text-zinc-500 text-xs mb-3">Account balances</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Cash", value: periodSummary.cash, icon: "💵" },
                    { label: "M-Pesa", value: periodSummary.mpesa, icon: "📱" },
                    { label: "Bank", value: periodSummary.bank, icon: "🏦" },
                  ].map((acc, i) => (
                    <div key={i} className="bg-zinc-800 rounded-xl p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-xs">{acc.icon}</span>
                        <p className="text-zinc-500 text-xs">{acc.label}</p>
                      </div>
                      <p className={`text-sm font-mono font-bold ${acc.value >= 0 ? "text-white" : "text-red-400"}`}>
                        {fmt(acc.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Low stock */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-sm">Low stock alerts</h3>
            <button onClick={() => navigateInstant("/inventory")} className="text-xs text-emerald-500 hover:text-emerald-400">
              View all
            </button>
          </div>
          {lowStockItems.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-4">All stock levels are healthy</p>
          ) : (
            <div className="space-y-3">
              {lowStockItems.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm">{p.name}</p>
                    <p className="text-zinc-500 text-xs">Reorder point: {p.reorder_point}</p>
                  </div>
                  <p className="text-red-400 text-sm font-mono">{p.current_quantity} left</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-28" />

      <FloatingBottomNav activePath="/dashboard" />
    </AppShell>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "morning"
  if (h < 17) return "afternoon"
  return "evening"
}