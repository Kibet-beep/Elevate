// src/pages/transactions/AddSale.jsx
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useUser, useCurrentBusiness } from "../../hooks/useRole"
import { useBranchContext } from "../../context/BranchContext"
import { useInstantAuth } from "../../hooks/useInstantAuth"
import { AppShell, UiButton, UiCard, UiSectionTitle } from "../../components/ui"
import { BranchSelector } from "../../components/BranchSelector"
import { useProducts } from "../../hooks/useProducts"
import {
  getTodayStartEAT,
  toTransactionDateEAT,
} from "../../features/dashboard/utils/dashboard.time"
import { recordSale } from "../../services/saleEntryService"

export default function AddSale() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const { user: authUser } = useUser()
  const { businessId } = useCurrentBusiness()
  const { business: instantBusiness, signOut } = useInstantAuth()

  const {
    effectiveBranchId,
    viewMode,
    canViewAll,
    readyToFetch,
    availableBranches,
  } = useBranchContext()

  const [todayValue] = useState(() => getTodayStartEAT())

  const resolvedBranchId = effectiveBranchId

  const { products } = useProducts(
    readyToFetch ? (canViewAll ? null : resolvedBranchId) : null,
    readyToFetch && canViewAll
  )

  const activeBranch = availableBranches?.find(
    (branch) => branch.id === resolvedBranchId
  )

  const [userId, setUserId] = useState(null)

  const [cartItems, setCartItems] = useState([])
  const [productSearch, setProductSearch] = useState("")

  const [paymentAccount, setPaymentAccount] = useState("cash")

  const [vatApplied, setVatApplied] = useState(false)
  const [vatRate, setVatRate] = useState(16)
  const [etimsNo, setEtimsNo] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const [discountEnabled, setDiscountEnabled] = useState(false)
  const [discountType, setDiscountType] = useState("pct")
  const [discountValue, setDiscountValue] = useState("")

  const [saleDate, setSaleDate] = useState(
    searchParams.get("date") || todayValue
  )

  useEffect(() => {
    if (authUser?.id) {
      setUserId(authUser.id)
    }
  }, [authUser?.id])

  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product_id === product.id)

      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, item.max_quantity),
              }
            : item
        )
      }

      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          unit_price: product.selling_price,
          vat_type: product.vat_type,
          quantity: 1,
          max_quantity: product.current_quantity,
        },
      ]
    })

    setProductSearch("")
  }

  const updateQty = (productId, qty) => {
    if (qty <= 0) {
      setCartItems((prev) =>
        prev.filter((item) => item.product_id !== productId)
      )
      return
    }

    setCartItems((prev) =>
      prev.map((item) => {
        if (item.product_id !== productId) return item

        return {
          ...item,
          quantity: Math.min(qty, item.max_quantity),
        }
      })
    )
  }

  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0
      ),
    [cartItems]
  )

  const discountAmount = useMemo(() => {
    if (!discountEnabled) return 0

    const value = parseFloat(discountValue) || 0

    if (discountType === "pct") {
      return subtotal * (value / 100)
    }

    return Math.min(value, subtotal)
  }, [discountEnabled, discountType, discountValue, subtotal])

  const vatAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const lineTotal = item.unit_price * item.quantity

      if (item.vat_type === "exclusive") {
        return sum + lineTotal * (vatRate / 100)
      }

      if (item.vat_type === "inclusive") {
        return sum + lineTotal * (16 / 116)
      }

      return sum
    }, 0)
  }, [cartItems, vatRate])

  const total = useMemo(() => {
    const exclusiveVat = cartItems.reduce((sum, item) => {
      const lineTotal = item.unit_price * item.quantity

      if (item.vat_type === "exclusive") {
        return sum + lineTotal * (vatRate / 100)
      }

      return sum
    }, 0)

    return subtotal - discountAmount + exclusiveVat
  }, [cartItems, subtotal, discountAmount, vatRate])

  const itemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  )

  const fmt = (value) =>
    `KES ${Number(value).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
    })}`

  const handleSubmit = async () => {
  if (loading) return

  if (!readyToFetch) {
    setError("Loading branch context, please wait")
    return
  }

  if (!businessId) {
    setError("Business not ready")
    return
  }

  if (!userId) {
    setError("User not ready")
    return
  }

  if (cartItems.length === 0) {
    setError("Add at least one product")
    return
  }

  if (canViewAll && !resolvedBranchId) {
    setError("Select a branch before recording a sale")
    return
  }

  if (!resolvedBranchId) {
    setError("Your branch is not assigned yet. Contact the owner.")
    return
  }

  try {
    setLoading(true)
    setError("")

    await recordSale({
      businessId,
      branchId: resolvedBranchId,
      userId,
      saleDate: toTransactionDateEAT(saleDate),
      paymentAccount,
      total,
      cartItems,
      etimsNo,
    })
    
    // Set success state immediately
    setSuccess(true)
  } catch (err) {
    setError(err?.message || "Failed to record sale")
  } finally {
    setLoading(false)
  }
}

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
            <span className="text-emerald-500 text-3xl">✓</span>
          </div>

          <h2 className="text-white font-bold text-xl">Sale recorded</h2>

          <p className="text-emerald-400 font-mono font-bold text-2xl">
            {fmt(total)}
          </p>

          <p className="text-zinc-400 text-sm capitalize">
            {paymentAccount}
          </p>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setCartItems([])
                setError("")
                setSuccess(false)
                setDiscountEnabled(false)
                setDiscountValue("")
                setPaymentAccount("cash")
                setSaleDate(todayValue)
              }}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              New sale
            </button>

            <button
              onClick={() => navigate("/transactions")}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              Back to transactions
            </button>
          </div>
        </div>
      </div>
    )
  }

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate("/transactions", { replace: true })
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
              <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">New Sale</h1>
              <p className="mt-1 text-zinc-400 text-xs sm:text-sm">
                {instantBusiness?.name} • {viewMode === "branch" && activeBranch ? `${activeBranch.name} • ` : ""}Record a sale transaction
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
          {error ? (
            <p className="rounded-lg bg-red-400/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          ) : null}

          <UiCard className="space-y-3 p-4">
            <UiSectionTitle
              title="Sale date"
              caption="Backdate historical sales if needed"
            />

            <input
              type="date"
              value={saleDate}
              onChange={(event) => setSaleDate(event.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-500"
            />
          </UiCard>

          <UiCard className="space-y-3 p-4">
            <UiSectionTitle
              title="Add products"
              caption="Search and select products to add to cart"
            />

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Search by product name or SKU..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-500"
              />

              {productSearch && products?.length > 0 && (
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 max-h-60 overflow-y-auto">
                  {products
                    .filter(
                      (p) =>
                        p.name
                          ?.toLowerCase()
                          .includes(productSearch.toLowerCase()) ||
                        p.sku
                          ?.toLowerCase()
                          .includes(productSearch.toLowerCase())
                    )
                    .slice(0, 10)
                    .map((product) => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className="w-full text-left px-4 py-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-b-0 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">
                              {product.name}
                            </p>
                            <p className="text-zinc-400 text-xs">
                              SKU: {product.sku} • Stock: {product.current_quantity}
                            </p>
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <p className="text-emerald-400 font-mono text-sm">
                              {fmt(product.selling_price)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </UiCard>

          {cartItems.length > 0 && (
            <UiCard className="space-y-3 p-4">
              <UiSectionTitle title="Cart" caption={`${itemCount} items`} />

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-2 px-2 text-zinc-400 font-medium">
                        Product
                      </th>
                      <th className="text-right py-2 px-2 text-zinc-400 font-medium">
                        Unit Price
                      </th>
                      <th className="text-center py-2 px-2 text-zinc-400 font-medium">
                        Qty
                      </th>
                      <th className="text-right py-2 px-2 text-zinc-400 font-medium">
                        Total
                      </th>
                      <th className="text-center py-2 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((item) => (
                      <tr key={item.product_id} className="border-b border-zinc-800">
                        <td className="py-3 px-2 text-white">{item.name}</td>
                        <td className="py-3 px-2 text-right text-zinc-300">
                          {fmt(item.unit_price)}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() =>
                                updateQty(item.product_id, item.quantity - 1)
                              }
                              className="w-6 h-6 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateQty(
                                  item.product_id,
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-10 h-6 bg-zinc-900 border border-zinc-800 rounded text-center text-white text-xs outline-none"
                            />
                            <button
                              onClick={() =>
                                updateQty(item.product_id, item.quantity + 1)
                              }
                              className="w-6 h-6 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-emerald-400">
                          {fmt(item.unit_price * item.quantity)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => updateQty(item.product_id, 0)}
                            className="text-red-400 hover:text-red-300 text-xs font-semibold"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </UiCard>
          )}

          <UiCard className="space-y-3 p-4">
            <UiSectionTitle
              title="Payment & Pricing"
              caption="Configure payment details and discounts"
            />

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">
                  Payment account
                </label>
                <select
                  value={paymentAccount}
                  onChange={(e) => setPaymentAccount(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="mpesa">M-Pesa</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                <input
                  type="checkbox"
                  id="discountEnabled"
                  checked={discountEnabled}
                  onChange={(e) => setDiscountEnabled(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="discountEnabled" className="text-sm text-white">
                  Apply discount
                </label>
              </div>

              {discountEnabled && (
                <div className="flex gap-2 pl-6">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="flex-shrink-0 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  >
                    <option value="pct">%</option>
                    <option value="fixed">Fixed</option>
                  </select>
                  <input
                    type="number"
                    placeholder={discountType === "pct" ? "0" : "0"}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                <input
                  type="checkbox"
                  id="vatApplied"
                  checked={vatApplied}
                  onChange={(e) => setVatApplied(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="vatApplied" className="text-sm text-white">
                  VAT (16%)
                </label>
              </div>

              {vatApplied && (
                <div className="pl-6">
                  <input
                    type="text"
                    placeholder="e-TIMS receipt number (optional)"
                    value={etimsNo}
                    onChange={(e) => setEtimsNo(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>
          </UiCard>
        </div>

        <div className="space-y-4">
          {cartItems.length > 0 && (
            <UiCard className="space-y-4 p-4 sticky top-20">
              <UiSectionTitle title="Summary" />

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Subtotal</span>
                  <span className="text-white font-mono">
                    {fmt(subtotal)}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-red-400">
                    <span>Discount</span>
                    <span className="font-mono">−{fmt(discountAmount)}</span>
                  </div>
                )}

                {vatApplied && vatAmount > 0 && (
                  <div className="flex items-center justify-between text-blue-400">
                    <span>VAT (16%)</span>
                    <span className="font-mono">+{fmt(vatAmount)}</span>
                  </div>
                )}

                <div className="border-t border-zinc-800 pt-2 flex items-center justify-between">
                  <span className="font-semibold text-white">Total</span>
                  <span className="text-emerald-400 font-mono font-bold text-lg">
                    {fmt(total)}
                  </span>
                </div>
              </div>

              <div className="hidden md:flex md:flex-col md:gap-2 pt-4 border-t border-zinc-800">
                <UiButton
                  variant="primary"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={loading || cartItems.length === 0}
                >
                  {loading ? "Recording..." : "Record sale"}
                </UiButton>
              </div>
            </UiCard>
          )}
        </div>
      </div>
      </div>

      <div className="fixed bottom-24 left-4 right-4 z-30 md:hidden">
        <UiButton
          variant="primary"
          className="w-full"
          onClick={handleSubmit}
          disabled={loading || cartItems.length === 0}
        >
          {loading ? "Recording..." : `Record sale • ${fmt(total)}`}
        </UiButton>
      </div>
    </AppShell>
  )
}
