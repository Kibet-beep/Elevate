// src/pages/transactions/AddTransfer.jsx
import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import { useUser, useCurrentBusiness } from "../../hooks/useRole"
import { AppShell, UiButton, UiCard, UiSectionTitle } from "../../components/ui"

const ACCOUNTS = ["cash", "mpesa", "bank"]

const TRANSFER_COSTS = {
  "cash-mpesa": false,
  "cash-bank": false,
  "mpesa-cash": true,
  "mpesa-bank": true,
  "bank-cash": true,
  "bank-mpesa": false,
}

export default function AddTransfer() {
  const navigate = useNavigate()
  const { user: authUser } = useUser()
  const { businessId } = useCurrentBusiness()
  const [userId, setUserId] = useState(null)
  const [fromAccount, setFromAccount] = useState("cash")
  const [toAccount, setToAccount] = useState("mpesa")
  const [amount, setAmount] = useState("")
  const [transactionCost, setTransactionCost] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (businessId && authUser) {
      setUserId(authUser.id)
      fetchBalances()
    }
  }, [businessId, authUser])

  const fetchBalances = async () => {
    const { data: userData } = await supabase
      .from("users")
      .select("business_id")
      .eq("id", (await supabase.auth.getUser()).data.user.id)
      .single()

    const bId = userData.business_id

    const { data: floatData } = await supabase
      .from("float_baseline")
      .select("*")
      .eq("business_id", bId)
      .maybeSingle()

    const { data: txns } = await supabase
      .from("transactions")
      .select("type, payment_account, sale_items(total_amount), expenses(amount)")
      .eq("business_id", bId)

    const { data: transfers } = await supabase
      .from("transfers")
      .select("*")
      .eq("business_id", bId)

    const calc = (account) => {
      const opening = floatData?.[`${account}_opening`] || 0
      const salesIn = (txns || [])
        .filter((t) => t.type === "sale" && t.payment_account === account)
        .reduce((s, t) => s + (t.sale_items?.reduce((a, i) => a + i.total_amount, 0) || 0), 0)
      const expOut = (txns || [])
        .filter((t) => t.type === "expense" && t.payment_account === account)
        .reduce((s, t) => s + (t.expenses?.reduce((a, e) => a + e.amount, 0) || 0), 0)
      const transferOut = (transfers || [])
        .filter((t) => t.from_account === account)
        .reduce((s, t) => s + t.amount + t.transaction_cost, 0)
      const transferIn = (transfers || [])
        .filter((t) => t.to_account === account)
        .reduce((s, t) => s + t.amount, 0)
      return opening + salesIn - expOut - transferOut + transferIn
    }

    setBalances({
      cash: calc("cash"),
      mpesa: calc("mpesa"),
      bank: calc("bank"),
    })
  }

  const transferKey = `${fromAccount}-${toAccount}`
  const hasCost = TRANSFER_COSTS[transferKey]
  const amt = parseFloat(amount) || 0
  const cost = parseFloat(transactionCost) || 0
  const amountReceived = amt - cost

  const fmt = (n) => `KES ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`

  const accountLabel = (acc) => {
    if (acc === "mpesa") return "M-Pesa"
    return acc.charAt(0).toUpperCase() + acc.slice(1)
  }

  const handleSubmit = async () => {
    setError("")

    if (!amount) {
      setError("Amount is required")
      return
    }
    if (fromAccount === toAccount) {
      setError("From and To accounts must be different")
      return
    }
    if (amt <= 0) {
      setError("Amount must be greater than zero")
      return
    }

    setLoading(true)

    // Record the transfer
    const { error: transferError } = await supabase.from("transfers").insert({
      business_id: businessId,
      from_account: fromAccount,
      to_account: toAccount,
      amount: amt,
      transaction_cost: cost,
      date: new Date(date).toISOString(),
      note: note || null,
      created_by: userId,
    })

    if (transferError) {
      setError(transferError.message)
      setLoading(false)
      return
    }

    // If there's a transaction cost, record it as an expense
    if (cost > 0) {
      const { data: txn, error: txnError } = await supabase
        .from("transactions")
        .insert({
          business_id: businessId,
          type: "expense",
          transaction_type_tag: "operating_expense",
          payment_account: fromAccount,
          account_code: "6600",
          date: new Date(date).toISOString(),
          created_by: userId,
        })
        .select()
        .single()

      if (!txnError) {
        await supabase.from("expenses").insert({
          transaction_id: txn.id,
          category: "Transfer cost",
          amount: cost,
          description: `Transfer cost: ${accountLabel(fromAccount)} → ${accountLabel(toAccount)}`,
        })
      }
    }

    setSuccess(true)
    setLoading(false)
  }

  const reset = () => {
    setAmount("")
    setTransactionCost("")
    setNote("")
    setSuccess(false)
  }

  if (success) {
    return (
      <AppShell title="Transfer recorded" subtitle={`${fmt(amt)} from ${accountLabel(fromAccount)} to ${accountLabel(toAccount)}`} contentClassName="max-w-xl">
        <UiCard className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
            <span className="text-emerald-500 text-3xl">✓</span>
          </div>
          <div className="space-y-1">
            <h2 className="text-white font-bold text-xl">Transfer recorded</h2>
            <p className="text-zinc-400 text-sm">{fmt(amt)} from {accountLabel(fromAccount)} → {accountLabel(toAccount)}</p>
            {cost > 0 && <p className="text-red-400 text-xs">Transaction cost of {fmt(cost)} recorded as expense</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <UiButton variant="secondary" className="flex-1" onClick={reset}>Record another</UiButton>
            <UiButton variant="primary" className="flex-1" onClick={() => navigate("/transactions")}>Back to transactions</UiButton>
          </div>
        </UiCard>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Transfer Funds"
      subtitle="Move money between accounts"
      contentClassName="max-w-6xl"
      right={<UiButton variant="secondary" size="sm" onClick={() => navigate("/transactions")}>← Back</UiButton>}
    >
      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}

          <UiCard className="p-4 space-y-4">
            <UiSectionTitle title="Transfer details" caption="Choose source and destination" />
            <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] items-start">
              <div className="space-y-2">
                <label className="text-zinc-400 text-xs block">From</label>
                <div className="space-y-2">
                  {ACCOUNTS.map((acc) => (
                    <UiButton
                      key={acc}
                      variant={fromAccount === acc ? "primary" : "secondary"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setFromAccount(acc)
                        if (acc === toAccount) setToAccount(ACCOUNTS.find((a) => a !== acc))
                      }}
                    >
                      {accountLabel(acc)}
                    </UiButton>
                  ))}
                </div>
              </div>

              <div className="text-zinc-600 text-2xl self-center text-center hidden sm:block">→</div>

              <div className="space-y-2">
                <label className="text-zinc-400 text-xs block">To</label>
                <div className="space-y-2">
                  {ACCOUNTS.map((acc) => (
                    <UiButton
                      key={acc}
                      variant={toAccount === acc ? "primary" : "secondary"}
                      size="sm"
                      className="w-full justify-start"
                      disabled={acc === fromAccount}
                      onClick={() => {
                        setToAccount(acc)
                        if (acc === fromAccount) setFromAccount(ACCOUNTS.find((a) => a !== acc))
                      }}
                    >
                      {accountLabel(acc)}
                    </UiButton>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Amount (KES)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {hasCost && (
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">
                  Transaction cost (KES) <span className="text-zinc-600">(optional)</span>
                </label>
                <input
                  type="number"
                  value={transactionCost}
                  onChange={(e) => setTransactionCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
                />
                <p className="text-zinc-600 text-xs mt-1">
                  This will be recorded as an expense from {accountLabel(fromAccount)}
                </p>
              </div>
            )}

            <div>
              <label className="text-zinc-400 text-xs mb-1 block">
                Note <span className="text-zinc-600">(optional)</span>
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Daily M-Pesa float"
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
              />
            </div>
          </UiCard>

          <UiCard className="p-4 space-y-2">
            <UiSectionTitle title="Transfer summary" />
            <div className="flex justify-between">
              <p className="text-zinc-400 text-sm">{accountLabel(fromAccount)} deducted</p>
              <p className="text-red-400 text-sm font-mono">-{fmt(amt + cost)}</p>
            </div>
            {cost > 0 && (
              <div className="flex justify-between">
                <p className="text-zinc-400 text-sm">Transaction cost</p>
                <p className="text-red-400 text-sm font-mono">-{fmt(cost)}</p>
              </div>
            )}
            <div className="flex justify-between border-t border-zinc-800 pt-2">
              <p className="text-zinc-400 text-sm">{accountLabel(toAccount)} receives</p>
              <p className="text-emerald-400 text-sm font-mono font-bold">+{fmt(amountReceived)}</p>
            </div>
          </UiCard>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 self-start">
          <UiCard className="p-5">
            <UiSectionTitle title="Live preview" caption="Balance impact before saving" />
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <p className="text-zinc-500">From</p>
                <p className="text-zinc-200">{accountLabel(fromAccount)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-zinc-500">To</p>
                <p className="text-zinc-200">{accountLabel(toAccount)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-zinc-500">Amount</p>
                <p className="text-red-400 font-mono">-{amount ? fmt(amt) : "KES 0.00"}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-zinc-500">Received</p>
                <p className="text-emerald-400 font-mono">+{amount ? fmt(amountReceived) : "KES 0.00"}</p>
              </div>
            </div>
          </UiCard>

          <UiCard className="p-5">
            <UiSectionTitle title="Confidence checklist" />
            {[
              { ok: !!amount, text: "Amount entered" },
              { ok: fromAccount !== toAccount, text: "Source and destination differ" },
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
        <UiButton
          variant="primary"
          className="w-full"
          onClick={handleSubmit}
          disabled={loading || !amount || fromAccount === toAccount}
        >
          {loading ? "Recording..." : "Record transfer"}
        </UiButton>
      </div>
    </AppShell>
  )
}
