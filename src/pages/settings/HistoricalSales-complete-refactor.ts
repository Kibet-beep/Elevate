// Complete HistoricalSales refactor
// Branch-safe, ledger-first, service-driven architecture

import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AppShell, UiButton } from "../../components/ui"
import { useBranchContext } from "../../context/BranchContext"
import { useCurrentBusiness } from "../../hooks/useRole"
import { useBranchScopedProducts } from "../../hooks/useBranchScopedProducts"
import { useHistoricalSales } from "../../hooks/useHistoricalSales"
import { commitHistoricalSales } from "../../services/salesService"

export default function HistoricalSales() {
  const navigate = useNavigate()
  const { businessId } = useCurrentBusiness()
  const { availableBranches, effectiveBranchId, canViewAll } = useBranchContext()

  const branchId = effectiveBranchId

  const { products, reload: reloadProducts } = useBranchScopedProducts()
  const { salesByDate, reload: reloadSales } = useHistoricalSales()

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [cartItems, setCartItems] = useState([])
  const [pendingTransactions, setPendingTransactions] = useState([])
  const [paymentAccount, setPaymentAccount] = useState("cash")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [cartItems]
  )

  const addToCart = (product) => {
    setCartItems((current) => {
      const existing = current.find((i) => i.product_id === product.id)
      if (existing) {
        return current.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }

      return [
        ...current,
        {
          product_id: product.id,
          name: product.name,
          unit_price: Number(product.selling_price || 0),
          quantity: 1,
        },
      ]
    })
  }

  const stageSale = () => {
    if (!branchId) {
      setError("Select a branch first")
      return
    }

    if (!cartItems.length) {
      setError("Add at least one item")
      return
    }

    const transactionId = `sale-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const transactionDate = selectedDate

    const stagedTransaction = {
      id: transactionId,
      date: transactionDate,
      paymentAccount: paymentAccount,
      total: subtotal,
      items: cartItems.map(item => ({
        product_id: item.product_id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_amount: item.quantity * item.unit_price,
      })),
      branchId: branchId, // Critical: Use staged branch, not current UI state
    }

    setPendingTransactions([...pendingTransactions, stagedTransaction])
    setCartItems([])
    setSelectedDate(new Date().toISOString().split("T")[0])
  }

  const commitSales = async () => {
    if (pendingTransactions.length === 0) {
      setError("No pending sales to commit")
      return
    }

    if (!branchId) {
      setError("No branch selected for commit")
      return
    }

    try {
      setLoading(true)
      setError("")

      const result = await commitHistoricalSales({
        businessId,
        branchId: branchId, // Use branchId from each staged transaction
        userId: businessId, // Using businessId as userId placeholder
        stagedTransactions: pendingTransactions,
      })

      if (result.successful > 0) {
        setPendingTransactions([])
        // Reload products to reflect inventory changes
        await reloadProducts()
        // Reload sales to show committed transactions
        await reloadSales()
      }

      setError(`Committed ${result.successful} of ${result.total} sales${result.failed > 0 ? ` (${result.failed} failed)` : ''}`)
    } catch (err: any) {
      setError(err?.message || "Failed to commit sales")
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate("/settings", { replace: true })
  }

  return (
    <AppShell showHeader={false} className="pb-24" contentClassName="max-w-4xl space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5 shadow-lg shadow-black/10">
        <div className="mb-6">
          <UiButton variant="secondary" onClick={goBack}>
            ← Back to Settings
          </UiButton>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Date Selection */}
          <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
            <h3 className="text-white font-semibold mb-4">Select Date</h3>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white"
            />
          </div>

          {/* Center: Product Selection */}
          <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
            <h3 className="text-white font-semibold mb-4">Products</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="w-full text-left p-3 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white text-sm">{product.name}</span>
                    <span className="text-zinc-400 text-xs">{product.current_quantity} in stock</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Cart & Actions */}
          <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
            <h3 className="text-white font-semibold mb-4">Cart</h3>
            <div className="space-y-2 mb-4">
              {cartItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-zinc-700 last:border-0">
                  <span className="text-white text-sm">{item.name}</span>
                  <span className="text-zinc-400 text-xs">×{item.quantity}</span>
                  <span className="text-emerald-400 text-sm">KES {(item.quantity * item.unit_price).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="text-emerald-400 text-sm mb-2">Subtotal: KES {subtotal.toLocaleString()}</div>

            <div className="space-y-2">
              <button
                onClick={stageSale}
                disabled={!branchId || cartItems.length === 0}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 text-white py-3 rounded-lg transition-colors"
              >
                Stage Sale
              </button>

              <button
                onClick={commitSales}
                disabled={pendingTransactions.length === 0 || !branchId || loading}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-700 text-white py-3 rounded-lg transition-colors"
              >
                {loading ? "Committing..." : `Commit ${pendingTransactions.length} Sales`}
              </button>
            </div>

            {pendingTransactions.length > 0 && (
              <div className="mt-4 p-3 bg-zinc-800 rounded-lg">
                <h4 className="text-white font-semibold mb-2">Pending Sales</h4>
                <div className="space-y-1">
                  {pendingTransactions.map((txn, index) => (
                    <div key={index} className="flex justify-between items-center py-1 text-sm">
                      <span className="text-zinc-300">{txn.date}</span>
                      <span className="text-zinc-400">{txn.items.length} items</span>
                      <span className="text-emerald-400">KES {txn.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>

        {/* Selected Date Sales */}
        {selectedDate && salesByDate[selectedDate] && (
          <div className="mt-6 bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
            <h3 className="text-white font-semibold mb-4">Sales for {selectedDate}</h3>
            <div className="space-y-2">
              {salesByDate[selectedDate].map((sale, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-zinc-700 last:border-0">
                  <span className="text-zinc-300 text-sm">{sale.payment_account}</span>
                  <span className="text-zinc-400">{sale.items?.length || 0} items</span>
                  <span className="text-emerald-400">KES {sale.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
