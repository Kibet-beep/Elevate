// src/pages/transactions/Transactions.jsx
import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import FloatingBottomNav from "../../components/layout/FloatingBottomNav"
import { AppShell, UiButton } from "../../components/ui"
import PaymentIcon from "../../components/ui/PaymentIcon"

const today = () => new Date().toISOString().split("T")[0]

export default function Transactions() {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [filtered, setFiltered] = useState([])
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState(today())   // ← default: today
  const [dateTo, setDateTo] = useState(today())       // ← default: today
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [selectedTx, setSelectedTx] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchTransactions() }, [])

  useEffect(() => {
    let result = transactions

    // Type filter
    if (filter !== "all") result = result.filter(t => t.type === filter)

    // Search
    if (search) result = result.filter(t =>
      t.display_name?.toLowerCase().includes(search.toLowerCase())
    )

    // Date range — always applied (defaults to today)
    if (dateFrom) result = result.filter(t => new Date(t.date) >= new Date(dateFrom))
    if (dateTo)   result = result.filter(t => new Date(t.date) <= new Date(dateTo + "T23:59:59"))

    // Payment account
    if (paymentFilter !== "all") result = result.filter(t => t.payment_account === paymentFilter)

    setFiltered(result)
  }, [filter, search, dateFrom, dateTo, paymentFilter, transactions])

  const fetchTransactions = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase
      .from("users")
      .select("business_id")
      .eq("id", user.id)
      .single()

    const { data } = await supabase
      .from("transactions")
      .select(`
        id, type, transaction_type_tag, payment_account, date, account_code,
        sale_items(total_amount, quantity, products(name)),
        expenses(amount, category, description)
      `)
      .eq("business_id", userData.business_id)
      .order("date", { ascending: false })

    const enriched = (data || []).map(t => {
      if (t.type === "sale") {
        const amount = t.sale_items?.reduce((s, i) => s + i.total_amount, 0) || 0
        const name = t.sale_items?.length > 1
          ? `${t.sale_items[0].products?.name} + ${t.sale_items.length - 1} more`
          : t.sale_items?.[0]?.products?.name || "Sale"
        return { ...t, amount, display_name: name }
      } else {
        const amount = t.expenses?.reduce((s, e) => s + e.amount, 0) || 0
        const name = t.expenses?.[0]?.category || "Expense"
        return { ...t, amount, display_name: name }
      }
    })

    setTransactions(enriched)
    setLoading(false)
  }

  const totalSales    = filtered.filter(t => t.type === "sale").reduce((s, t) => s + t.amount, 0)
  const totalExpenses = filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)

  const rowsWithBalance = (() => {
    const rows = [...filtered].reverse()
    let running = 0
    const withBalance = rows.map(t => {
      running += t.type === "sale" ? t.amount : -t.amount
      return { ...t, balance: running }
    })
    return withBalance.reverse()
  })()

  const fmt = (n) => `KES ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`

  const periodLabel = () => {
    if (dateFrom === today() && dateTo === today()) return "Today"
    if (dateFrom === dateTo) return new Date(dateFrom).toLocaleDateString("en-KE")
    if (dateFrom && dateTo) return `${new Date(dateFrom).toLocaleDateString("en-KE")} – ${new Date(dateTo).toLocaleDateString("en-KE")}`
    if (dateFrom) return `From ${new Date(dateFrom).toLocaleDateString("en-KE")}`
    if (dateTo)   return `Up to ${new Date(dateTo).toLocaleDateString("en-KE")}`
    return "All time"
  }

  const clearDates = () => { setDateFrom(""); setDateTo("") }

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <p className="text-zinc-500 text-sm">Loading transactions...</p>
    </div>
  )

  return (
    <AppShell
      title="Transactions"
      subtitle={`${filtered.length} transactions · ${periodLabel()}`}
      right={(
        <>
          <UiButton variant="secondary" size="sm" onClick={() => navigate("/transactions/add-expense")}>+ Expense</UiButton>
          <UiButton variant="secondary" size="sm" onClick={() => navigate("/transactions/transfer")}>⇄ Transfer</UiButton>
          <UiButton variant="primary" size="sm" onClick={() => navigate("/transactions/add-sale")}>+ Sale</UiButton>
        </>
      )}
    >
      <div className="space-y-4">

        {/* Summary cards — scoped to filtered period */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <p className="text-zinc-500 text-xs mb-1">Sales</p>
            <p className="text-emerald-400 font-bold font-mono text-sm">{fmt(totalSales)}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <p className="text-zinc-500 text-xs mb-1">Expenses</p>
            <p className="text-red-400 font-bold font-mono text-sm">{fmt(totalExpenses)}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <p className="text-zinc-500 text-xs mb-1">Net</p>
            <p className={`font-bold font-mono text-sm ${totalSales - totalExpenses >= 0 ? "text-white" : "text-red-400"}`}>
              {fmt(totalSales - totalExpenses)}
            </p>
          </div>
        </div>

        {/* ── DESKTOP CONTROLS ── */}
        <div className="hidden md:block space-y-3">
          {/* Type + Payment filters */}
          <div className="flex gap-2">
            {["all", "sale", "expense"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors capitalize ${
                  filter === f ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {f === "all" ? "All types" : f === "sale" ? "Sales" : "Expenses"}
              </button>
            ))}
            <div className="w-px bg-zinc-800 mx-1" />
            {["all", "cash", "mpesa", "bank"].map(p => (
              <button
                key={p}
                onClick={() => setPaymentFilter(p)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                  paymentFilter === p ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {p !== "all" && <PaymentIcon type={p} className="h-3.5 w-3.5" />}
                <span className="capitalize">{p === "all" ? "All accounts" : p === "mpesa" ? "M-Pesa" : p.charAt(0).toUpperCase() + p.slice(1)}</span>
              </button>
            ))}
          </div>

          {/* Date range + search */}
          <div className="flex gap-2 items-end">
            <div>
              <label className="text-zinc-500 text-xs mb-1 block">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-zinc-500 text-xs mb-1 block">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            {/* Quick period shortcuts */}
            {[
              { label: "Today", fn: () => { setDateFrom(today()); setDateTo(today()) } },
              { label: "This week", fn: () => {
                const d = new Date(); const mon = new Date(d); mon.setDate(d.getDate() - d.getDay() + 1)
                setDateFrom(mon.toISOString().split("T")[0]); setDateTo(today())
              }},
              { label: "This month", fn: () => {
                const d = new Date()
                setDateFrom(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`); setDateTo(today())
              }},
              { label: "All time", fn: () => { setDateFrom(""); setDateTo("") } },
            ].map(s => (
              <button key={s.label} onClick={s.fn}
                className="px-3 py-2.5 rounded-xl text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors self-end">
                {s.label}
              </button>
            ))}
            <div className="flex-1 self-end">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
              />
            </div>
          </div>
        </div>

        {/* ── MOBILE CONTROLS ── */}
        <div className="md:hidden space-y-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-sm font-medium rounded-xl px-4 py-3 transition-colors text-left"
            >
              <span className="text-zinc-500 text-xs">Period · </span>{periodLabel()}
            </button>
            {(dateFrom !== today() || dateTo !== today()) && (
              <button
                onClick={() => { setDateFrom(today()); setDateTo(today()) }}
                className="px-3 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs transition-colors"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {/* ── TRANSACTION TABLE + DETAIL PANEL ── */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-600 text-sm">No transactions for {periodLabel().toLowerCase()}</p>
            <div className="flex gap-2 justify-center mt-4">
              <button
                onClick={() => navigate("/transactions/add-sale")}
                className="bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                Record sale
              </button>
              {dateFrom || dateTo ? (
                <button
                  onClick={clearDates}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium px-4 py-2 rounded-xl transition-colors"
                >
                  View all time
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex gap-4 items-start">

            {/* ── TABLE ── */}
            <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-200 ${selectedTx ? "hidden md:block md:flex-1" : "w-full"}`}>

              {/* Mobile cards */}
              <div className="md:hidden p-2 space-y-2">
                {rowsWithBalance.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTx(selectedTx?.id === t.id ? null : t)}
                    className={`w-full text-left rounded-xl px-3 py-3 border transition-colors ${
                      selectedTx?.id === t.id
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-zinc-950/60 border-zinc-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{t.display_name}</p>
                        <p className="text-zinc-500 text-[11px] mt-0.5 flex items-center gap-2">
                          {new Date(t.date).toLocaleDateString("en-KE")} ·{" "}
                          <span className="flex items-center gap-1">
                            <PaymentIcon type={t.payment_account} className="h-3.5 w-3.5 text-zinc-400" />
                            <span className="capitalize">{t.payment_account}</span>
                          </span>
                        </p>
                      </div>
                      <p className={`text-xs font-mono font-semibold whitespace-nowrap ${t.type === "sale" ? "text-emerald-400" : "text-red-400"}`}>
                        {t.type === "sale" ? "+" : "-"}{fmt(t.amount)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${t.type === "sale" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-400/10 text-red-400"}`}>
                        {t.type === "sale" ? "Sale" : "Expense"}
                      </span>
                      <p className={`text-[11px] font-mono ${t.balance >= 0 ? "text-zinc-300" : "text-red-400"}`}>
                        Balance: {fmt(t.balance)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="sticky top-0 bg-zinc-900 z-10">
                    <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                      <th className="py-3 px-4 font-medium">Date</th>
                      <th className="py-3 px-4 font-medium">Type</th>
                      <th className="py-3 px-4 font-medium">Description</th>
                      <th className="py-3 px-4 font-medium">Payment</th>
                      <th className="py-3 px-4 font-medium text-right">Amount</th>
                      <th className="py-3 px-4 font-medium text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowsWithBalance.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTx(selectedTx?.id === t.id ? null : t)}
                        className={`border-b border-zinc-900 cursor-pointer transition-colors ${
                          selectedTx?.id === t.id
                            ? "bg-emerald-500/10"
                            : "hover:bg-zinc-800/60"
                        }`}
                      >
                        <td className="py-3 px-4 text-xs text-zinc-400 whitespace-nowrap">
                          {new Date(t.date).toLocaleDateString("en-KE")}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${t.type === "sale" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-400/10 text-red-400"}`}>
                            {t.type === "sale" ? "Sale" : "Expense"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-white font-medium">{t.display_name}</td>
                        <td className="py-3 px-4 text-xs text-zinc-400">
                          <div className="flex items-center gap-2 capitalize">
                            <PaymentIcon type={t.payment_account} className="h-4 w-4 text-zinc-400" />
                            <span>{t.payment_account}</span>
                          </div>
                        </td>
                        <td className={`py-3 px-4 text-xs text-right font-mono font-medium ${t.type === "sale" ? "text-emerald-400" : "text-red-400"}`}>
                          {t.type === "sale" ? "+" : "-"}{fmt(t.amount)}
                        </td>
                        <td className={`py-3 px-4 text-xs text-right font-mono ${t.balance >= 0 ? "text-zinc-300" : "text-red-400"}`}>
                          {fmt(t.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── DESKTOP DETAIL PANEL ── */}
            {selectedTx && (
              <div className="hidden md:block w-72 shrink-0 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden sticky top-6">
                {/* Panel header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Transaction</p>
                    <p className="text-white text-sm font-semibold mt-0.5 truncate max-w-[160px]">{selectedTx.display_name}</p>
                  </div>
                  <button
                    onClick={() => setSelectedTx(null)}
                    className="text-zinc-600 hover:text-white transition-colors text-sm w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800"
                  >
                    ✕
                  </button>
                </div>

                {/* Amount hero */}
                <div className="px-5 py-5 border-b border-zinc-800">
                  <p className="text-zinc-500 text-xs mb-1">{selectedTx.type === "sale" ? "Revenue" : "Expense"}</p>
                  <p className={`text-2xl font-mono font-bold ${selectedTx.type === "sale" ? "text-emerald-400" : "text-red-400"}`}>
                    {selectedTx.type === "sale" ? "+" : "-"}{fmt(selectedTx.amount)}
                  </p>
                </div>

                {/* Details */}
                <div className="px-5 py-4 space-y-3">
                  <DetailRow label="Date" value={new Date(selectedTx.date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })} />
                  <DetailRow label="Type">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${selectedTx.type === "sale" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-400/10 text-red-400"}`}>
                      {selectedTx.type === "sale" ? "Sale" : "Expense"}
                    </span>
                  </DetailRow>
                  <DetailRow label="Payment">
                    <span className="flex items-center gap-2 text-zinc-300 text-xs capitalize">
                      <PaymentIcon type={selectedTx.payment_account} className="h-4 w-4 text-zinc-400" />
                      {selectedTx.payment_account}
                    </span>
                  </DetailRow>
                  {selectedTx.type === "expense" && selectedTx.expenses?.[0]?.category && (
                    <DetailRow label="Category" value={selectedTx.expenses[0].category} />
                  )}
                  {selectedTx.type === "expense" && selectedTx.expenses?.[0]?.description && (
                    <DetailRow label="Description" value={selectedTx.expenses[0].description} />
                  )}
                  {selectedTx.type === "sale" && selectedTx.sale_items?.length > 0 && (
                    <div>
                      <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-medium mb-2">Items sold</p>
                      <div className="space-y-1.5">
                        {selectedTx.sale_items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between bg-zinc-950 rounded-lg px-3 py-2">
                            <p className="text-zinc-300 text-xs truncate max-w-[130px]">{item.products?.name}</p>
                            <div className="text-right shrink-0">
                              <p className="text-zinc-400 text-xs font-mono">{fmt(item.total_amount)}</p>
                              <p className="text-zinc-600 text-[10px]">×{item.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="pt-2 border-t border-zinc-800">
                    <DetailRow
                      label="Running balance"
                      value={fmt(selectedTx.balance)}
                      valueClass={selectedTx.balance >= 0 ? "text-zinc-300" : "text-red-400"}
                    />
                  </div>
                  <div className="pt-1">
                    <p className="text-zinc-600 text-[10px] font-mono">ID · {selectedTx.id?.slice(0, 8)}...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile FABs */}
      <div className="md:hidden fixed bottom-24 left-4 right-4 z-30 grid grid-cols-2 gap-2">
        <button onClick={() => navigate("/transactions/add-expense")} className="bg-zinc-900/95 border border-zinc-800 text-zinc-200 rounded-xl py-3 text-sm font-medium">
          + Expense
        </button>
        <button onClick={() => navigate("/transactions/add-sale")} className="bg-emerald-500 text-black rounded-xl py-3 text-sm font-semibold">
          + Sale
        </button>
      </div>

      <FloatingBottomNav active="transactions" />

      {/* ── MOBILE FILTER SHEET ── */}
      {mobileFilterOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/60" onClick={() => setMobileFilterOpen(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-5" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
            <p className="text-white text-sm font-semibold mb-4">Filter transactions</p>

            <div className="space-y-4">
              <div>
                <label className="text-zinc-500 text-xs mb-2 block">Type</label>
                <div className="flex gap-2">
                  {["all", "sale", "expense"].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors capitalize ${filter === f ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-400"}`}>
                      {f === "all" ? "All" : f === "sale" ? "Sales" : "Expenses"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-zinc-500 text-xs mb-2 block">Payment account</label>
                <div className="flex gap-2 flex-wrap">
                  {["all", "cash", "mpesa", "bank"].map(p => (
                    <button key={p} onClick={() => setPaymentFilter(p)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${paymentFilter === p ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-400"}`}>
                      {p !== "all" && <PaymentIcon type={p} className="h-3.5 w-3.5" />}
                      <span className="capitalize">{p === "all" ? "All" : p === "mpesa" ? "M-Pesa" : p.charAt(0).toUpperCase() + p.slice(1)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-zinc-500 text-xs mb-2 block">Quick period</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Today", fn: () => { setDateFrom(today()); setDateTo(today()) } },
                    { label: "This week", fn: () => {
                      const d = new Date(); const mon = new Date(d); mon.setDate(d.getDate() - d.getDay() + 1)
                      setDateFrom(mon.toISOString().split("T")[0]); setDateTo(today())
                    }},
                    { label: "This month", fn: () => {
                      const d = new Date()
                      setDateFrom(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`); setDateTo(today())
                    }},
                    { label: "All time", fn: () => { setDateFrom(""); setDateTo("") } },
                  ].map(s => (
                    <button key={s.label} onClick={s.fn}
                      className="py-2.5 rounded-xl text-xs font-medium bg-zinc-800 text-zinc-300 hover:text-white transition-colors">
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-500 text-xs mb-1 block">From</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-3 text-sm outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-zinc-500 text-xs mb-1 block">To</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-3 text-sm outline-none focus:border-emerald-500" />
                </div>
              </div>

              <button onClick={() => setMobileFilterOpen(false)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl py-3.5 text-sm font-semibold transition-colors">
                Apply filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE DETAIL SHEET ── */}
      {selectedTx && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/60" onClick={() => setSelectedTx(null)}>
          <div className="absolute bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-5" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />

            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-white text-base font-semibold">{selectedTx.display_name}</p>
                <p className="text-zinc-500 text-xs mt-0.5">{new Date(selectedTx.date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
              <p className={`text-lg font-mono font-bold ${selectedTx.type === "sale" ? "text-emerald-400" : "text-red-400"}`}>
                {selectedTx.type === "sale" ? "+" : "-"}{fmt(selectedTx.amount)}
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <MobileDetailRow label="Type">
                <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${selectedTx.type === "sale" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-400/10 text-red-400"}`}>
                  {selectedTx.type === "sale" ? "Sale" : "Expense"}
                </span>
              </MobileDetailRow>
              <MobileDetailRow label="Payment">
                <span className="flex items-center gap-2 text-zinc-300 capitalize">
                  <PaymentIcon type={selectedTx.payment_account} className="h-4 w-4 text-zinc-400" />
                  {selectedTx.payment_account}
                </span>
              </MobileDetailRow>
              {selectedTx.type === "expense" && selectedTx.expenses?.[0]?.category && (
                <MobileDetailRow label="Category" value={selectedTx.expenses[0].category} />
              )}
              {selectedTx.type === "expense" && selectedTx.expenses?.[0]?.description && (
                <MobileDetailRow label="Description" value={selectedTx.expenses[0].description} />
              )}
              {selectedTx.type === "sale" && selectedTx.sale_items?.length > 0 && (
                <div>
                  <p className="text-zinc-500 text-xs mb-2">Items sold</p>
                  <div className="space-y-1.5">
                    {selectedTx.sale_items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between bg-zinc-950 rounded-lg px-3 py-2">
                        <p className="text-zinc-300 text-xs">{item.products?.name}</p>
                        <div className="text-right">
                          <p className="text-zinc-400 text-xs font-mono">{fmt(item.total_amount)}</p>
                          <p className="text-zinc-600 text-[10px]">×{item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                <p className="text-zinc-500 text-xs">Running balance</p>
                <p className={`font-mono text-sm ${selectedTx.balance >= 0 ? "text-zinc-300" : "text-red-400"}`}>{fmt(selectedTx.balance)}</p>
              </div>
            </div>

            <button onClick={() => setSelectedTx(null)}
              className="mt-5 w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl py-3 text-sm font-medium transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </AppShell>
  )
}

// ── HELPERS ──

function DetailRow({ label, value, valueClass = "text-zinc-300", children }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <p className="text-zinc-500 text-xs shrink-0">{label}</p>
      {children ?? <p className={`text-xs text-right ${valueClass}`}>{value}</p>}
    </div>
  )
}

function MobileDetailRow({ label, value, children }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-zinc-500 text-sm">{label}</p>
      {children ?? <p className="text-zinc-300 text-sm">{value}</p>}
    </div>
  )
}