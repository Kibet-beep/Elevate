// src/pages/transactions/AddExpense.jsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useUser, useCurrentBusiness } from "../../hooks/useRole"
import { useBranchContext } from "../../context/BranchContext"
import { useInstantAuth } from "../../hooks/useInstantAuth"
import { BranchSelector } from "../../components/BranchSelector"
import { AppShell, UiButton, UiCard, UiSectionTitle } from "../../components/ui"
import { getDb } from "../../lib/db"
import { toTransactionDateEAT } from "../../features/dashboard/utils/dashboard.time"

const EXPENSE_CATEGORIES = [
  "Rent", "Utilities", "Salaries & Wages", "Transport",
  "Marketing", "Stock Purchase", "Equipment", "Miscellaneous"
]

const ACCOUNT_MAP = {
  "Rent": "6100",
  "Utilities": "6200",
  "Salaries & Wages": "6300",
  "Transport": "6400",
  "Marketing": "6500",
  "Stock Purchase": "5100",
  "Equipment": "1300",
  "Miscellaneous": "6600",
}

export default function AddExpense() {
  const navigate = useNavigate()
  const { user: authUser } = useUser()
  const { businessId } = useCurrentBusiness()
  const { business: instantBusiness, signOut } = useInstantAuth()
  const { effectiveBranchId, canViewAll, readyToFetch } = useBranchContext()
  const [userId, setUserId] = useState(null)
  
  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate("/transactions", { replace: true })
  }
  const [category, setCategory] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [paymentAccount, setPaymentAccount] = useState("cash")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const resolvedBranchId = effectiveBranchId

  useEffect(() => {
    if (businessId && authUser) {
      setUserId(authUser.id)
    }
  }, [businessId, authUser])

  const handleSubmit = async () => {
  if (loading) return

  const amountNum = parseFloat(amount) || 0

  if (!category || !amount) {
    setError("Category and amount are required")
    return
  }

  if (amountNum <= 0) {
    setError("Amount must be greater than zero")
    return
  }

  if (!readyToFetch) {
    setError("Loading branch context, please wait")
    return
  }

  if (canViewAll && !resolvedBranchId) {
    setError("Select a branch before recording an expense")
    return
  }

  if (!resolvedBranchId) {
    setError("Your branch is not assigned yet. Contact owner.")
    return
  }

  try {
    setLoading(true)
    setError("")

    const accountCode = ACCOUNT_MAP[category] || "6600"

    const tag =
      category === "Stock Purchase"
        ? "cost_of_goods_sold"
        : category === "Equipment"
          ? "asset_purchase"
          : "operating_expense"

    const transactionId = crypto.randomUUID?.() || `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const transaction = {
      id: transactionId,
      business_id: businessId,
      branch_id: resolvedBranchId,
      type: "expense",
      transaction_type_tag: tag,
      payment_account: paymentAccount,
      account_code: accountCode,
      date: toTransactionDateEAT(date),
      created_by: userId,
      lifecycle_state: "finalized",
      amount: amountNum,
      display_name: category,
      _modified: Date.now(),
      _deleted: false,
      expenses: [{
        transaction_id: transactionId,
        category,
        amount: amountNum,
        description: description || null,
      }],
    }

    // Optimistic update for immediate UI feedback
    const optimisticTransaction = {
      ...transaction,
      _modified: Date.now(),
      _deleted: false,
    }

    const db = await getDb()
    // Insert locally first for instant UI update
    await db.transactions.insert(optimisticTransaction)
    
    // Set success state immediately
    setSuccess(true)
  } catch (err) {
    setError(err?.message || "Failed to record expense")
  } finally {
    setLoading(false)
  }
}

  const fmt = (n) => `KES ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center mx-auto">
            <span className="text-red-400 text-3xl">↓</span>
          </div>
          <h2 className="text-white font-bold text-xl">Expense recorded</h2>
          <p className="text-red-400 font-mono font-bold text-2xl">{fmt(parseFloat(amount))}</p>
          <p className="text-zinc-400 text-sm">{category}</p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setCategory(""); setAmount(""); setDescription(""); setSuccess(false) }}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              Add another
            </button>
            <button
              onClick={() => navigate("/transactions")}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              View all
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppShell showHeader={false} className="pb-24" contentClassName="max-w-6xl space-y-4">
      {/* Back button */}
      <div className="px-4 sm:px-5 pt-4 pb-2">
        <button onClick={goBack} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm">
          ← Back
        </button>
      </div>
      
      {/* Hero header */}
      <div className="px-4 sm:px-5 pb-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5 shadow-lg shadow-black/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Transactions</p>
              <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">New Expense</h1>
              <p className="mt-1 text-zinc-400 text-xs sm:text-sm">
                {instantBusiness?.name} • Record a business expense
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canViewAll ? <BranchSelector /> : null}
              <button onClick={() => signOut()} className="text-zinc-400 hover:text-red-400 transition-colors text-sm">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 sm:px-5">
      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}

          <UiCard className="p-4 space-y-4">
            <UiSectionTitle title="Expense details" caption="Choose category and fill the receipt" />
            <div>
              <label className="text-zinc-400 text-xs mb-2 block">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {EXPENSE_CATEGORIES.map(cat => (
                  <UiButton
                    key={cat}
                    variant={category === cat ? "primary" : "secondary"}
                    size="sm"
                    className="justify-start text-left"
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                  </UiButton>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Amount (KES) <span className="text-red-400">*</span></label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600" />
                {amount && parseFloat(amount) <= 0 && <p className="text-red-400 text-xs mt-1">Amount must be greater than zero</p>}
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors" />
              </div>
            </div>

            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Description <span className="text-zinc-600">(optional)</span></label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Monthly rent for Westlands shop" className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600" />
            </div>
          </UiCard>

          <UiCard className="p-4 space-y-3">
            <UiSectionTitle title="Paid from" />
            <div className="flex gap-2">
              {["cash", "mpesa", "bank"].map(method => (
                <UiButton key={method} variant={paymentAccount === method ? "primary" : "secondary"} size="sm" className="flex-1 capitalize" onClick={() => setPaymentAccount(method)}>
                  {method === "mpesa" ? "M-Pesa" : method.charAt(0).toUpperCase() + method.slice(1)}
                </UiButton>
              ))}
            </div>
          </UiCard>

          {category && amount && (
            <UiCard className="px-4 py-3 flex justify-between items-center">
              <p className="text-zinc-400 text-sm">{category}</p>
              <p className="text-red-400 font-mono font-bold">{fmt(parseFloat(amount) || 0)}</p>
            </UiCard>
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 self-start">
          <UiCard className="p-5">
            <UiSectionTitle title="Live preview" caption="What will be recorded" />
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><p className="text-zinc-500">Category</p><p className="text-zinc-200">{category || "-"}</p></div>
              <div className="flex items-center justify-between"><p className="text-zinc-500">Amount</p><p className="text-red-400 font-mono">{amount ? fmt(parseFloat(amount)) : "KES 0.00"}</p></div>
              <div className="flex items-center justify-between"><p className="text-zinc-500">Payment</p><p className="text-zinc-200 capitalize">{paymentAccount}</p></div>
              <div className="flex items-center justify-between border-t border-zinc-800 pt-2"><p className="text-zinc-500">Date</p><p className="text-zinc-200">{date}</p></div>
            </div>
          </UiCard>

          <UiCard className="p-5">
            <UiSectionTitle title="Confidence checklist" />
            {[
              { ok: !!category, text: "Category selected" },
              { ok: !!amount, text: "Amount entered" },
              { ok: !!date, text: "Date selected" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1">
                <p className={item.ok ? "text-zinc-300" : "text-zinc-600"}>{item.text}</p>
                <span className={item.ok ? "text-emerald-400" : "text-zinc-700"}>{item.ok ? "✓" : "•"}</span>
              </div>
            ))}
          </UiCard>
        </div>
      </div>

      <div className="md:hidden fixed bottom-24 left-4 right-4 z-30">
        <UiButton variant="primary" className="w-full" onClick={handleSubmit} disabled={loading || !category || !amount}>
          {loading ? "Recording..." : "Record expense"}
        </UiButton>
      </div>
      </div>
    </AppShell>
  )
}