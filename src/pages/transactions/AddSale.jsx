// src/pages/transactions/AddSale.jsx
import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { useUser, useCurrentBusiness } from "../../hooks/useRole"
import { useBranchContext } from "../../hooks/useBranchContext"
import { AppShell, UiButton, UiCard, UiSectionTitle } from "../../components/ui"
import PaymentIcon from "../../components/ui/PaymentIcon"
import { BranchSelector } from "../../components/BranchSelector"

export default function AddSale() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user: authUser } = useUser()
  const { businessId } = useCurrentBusiness()
  const { currentBranchId, viewMode, canViewAll, activeBranch } = useBranchContext()
  const [userId, setUserId] = useState(null)
  const [products, setProducts] = useState([])
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
  const [saleDate, setSaleDate] = useState(searchParams.get("date") || new Date().toISOString().split("T")[0])
  const resolvedBranchId = currentBranchId || activeBranch?.id || null

  useEffect(() => {
    fetchData()
  }, [businessId, currentBranchId, viewMode, authUser, canViewAll])

  const fetchData = async () => {
    if (!businessId || !authUser) return

    if (canViewAll && !resolvedBranchId) {
      setProducts([])
      setError("Select a branch before recording a sale")
      setLoading(false)
      return
    }

    const query = supabase
      .from("products")
      .select("id, name, sku_id, selling_price, current_quantity, unit_of_measure, vat_type, branch_id")
      .eq("business_id", businessId)
      .not("is_active", "eq", false)
      .order("name")

    const productQuery = viewMode === "branch" && resolvedBranchId
      ? query.or(`branch_id.eq.${resolvedBranchId},branch_id.is.null`)
      : query

    const { data, error: fetchError } = await productQuery

    if (fetchError) {
      setError(fetchError.message)
      setProducts([])
      setLoading(false)
      return
    }

    setProducts(data || [])
    setUserId(authUser.id)
  }

  const addToCart = (product) => {
    const existing = cartItems.find((item) => item.product_id === product.id)
    if (existing) {
      setCartItems(
        cartItems.map((item) =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      )
    } else {
      setCartItems([
        ...cartItems,
        {
          product_id: product.id,
          name: product.name,
          unit_price: product.selling_price,
          vat_type: product.vat_type,
          quantity: 1,
          max_quantity: product.current_quantity,
        },
      ])
    }
    setProductSearch("")
  }

  const updateQty = (productId, qty) => {
    if (qty <= 0) {
      setCartItems(cartItems.filter((item) => item.product_id !== productId))
      return
    }

    setCartItems(
      cartItems.map((item) => (item.product_id === productId ? { ...item, quantity: qty } : item))
    )
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const discountAmount = discountEnabled
    ? discountType === "pct"
      ? subtotal * ((parseFloat(discountValue) || 0) / 100)
      : Math.min(parseFloat(discountValue) || 0, subtotal)
    : 0

  const vatAmount = cartItems.reduce((sum, item) => {
    const lineTotal = item.unit_price * item.quantity
    if (item.vat_type === "exclusive") return sum + lineTotal * (vatRate / 100)
    if (item.vat_type === "inclusive") return sum + lineTotal * (16 / 116)
    return sum
  }, 0)

  const total = subtotal - discountAmount + cartItems.reduce((sum, item) => {
    const lineTotal = item.unit_price * item.quantity
    if (item.vat_type === "exclusive") return sum + lineTotal * (vatRate / 100)
    return sum
  }, 0)

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const fmt = (value) => `KES ${Number(value).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`

  const handleSubmit = async () => {
    if (cartItems.length === 0) {
      setError("Add at least one product")
      return
    }

    if (canViewAll && !resolvedBranchId) {
      setError("Select a branch before recording a sale")
      return
    }

    setLoading(true)
    setError("")

    const { data: txn, error: txnError } = await supabase
      .from("transactions")
        .insert({
          business_id: businessId,
          branch_id: viewMode === "branch" ? resolvedBranchId : null,
          type: "sale",
        transaction_type_tag: "income",
        payment_account: paymentAccount,
        account_code: "4100",
        date: new Date(`${saleDate}T12:00:00Z`).toISOString(),
        created_by: userId,
      })
      .select()
      .single()

    if (txnError) {
      setError(txnError.message)
      setLoading(false)
      return
    }

    const items = cartItems.map((item) => ({
      transaction_id: txn.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_amount: item.unit_price * item.quantity,
      vat_applied: item.vat_type !== "exempt" ? 1 : 0,
      etims_receipt_no: etimsNo || null,
    }))

    const { error: itemsError } = await supabase.from("sale_items").insert(items)

    if (itemsError) {
      setError(itemsError.message)
      setLoading(false)
      return
    }

    const updates = cartItems.map((item) =>
      supabase.rpc("decrement_stock", {
        product_id: item.product_id,
        amount: item.quantity,
      })
    )

    await Promise.all(updates)

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
            <span className="text-emerald-500 text-3xl">?</span>
          </div>
          <h2 className="text-white font-bold text-xl">Sale recorded</h2>
          <p className="text-emerald-400 font-mono font-bold text-2xl">{fmt(total)}</p>
          <p className="text-zinc-400 text-sm capitalize">{paymentAccount}</p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setCartItems([])
                setSuccess(false)
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

  return (
    <AppShell
      title="New Sale"
      subtitle={`${viewMode === "branch" && activeBranch ? `${activeBranch.name} � ` : ""}Record a sale transaction`}
      contentClassName="max-w-6xl"
      right={(
        <div className="flex w-full flex-wrap items-stretch gap-1.5 sm:w-auto sm:items-center sm:gap-3">
          <UiButton variant="secondary" size="sm" onClick={() => navigate("/transactions")} className="flex-1 px-2 text-xs sm:flex-none sm:px-3">? Back</UiButton>
          {canViewAll ? <BranchSelector /> : null}
        </div>
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          {error && <p className="rounded-lg bg-red-400/10 px-3 py-2 text-sm text-red-400">{error}</p>}

          <UiCard className="space-y-3 p-4">
            <UiSectionTitle title="Sale date" caption="Backdate historical sales if needed" />
            <input
              type="date"
              value={saleDate}
              onChange={(event) => setSaleDate(event.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-500"
            />
          </UiCard>

          <UiCard className="space-y-3 p-4">
            <UiSectionTitle title="Add products" caption="Search and build the cart" />
            <input
              type="text"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Search product name or SKU..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500"
            />
            {productSearch && (
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {products
                  .filter((product) => {
                    const search = productSearch.toLowerCase()
                    return (
                      product.name?.toLowerCase().includes(search) ||
                      product.sku_id?.toLowerCase().includes(search)
                    )
                  })
                  .map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-left transition-colors hover:border-zinc-700"
                    >
                      <div>
                        <p className="text-sm text-white">{product.name}</p>
                        <p className="text-xs text-zinc-500">{product.current_quantity} in stock</p>
                      </div>
                      <p className="text-sm font-mono text-emerald-400">{fmt(product.selling_price)}</p>
                    </button>
                  ))}
              </div>
            )}
          </UiCard>

          {cartItems.length > 0 && (
            <UiCard className="space-y-3 p-4">
              <UiSectionTitle title="Cart" caption={`${itemCount} items across ${cartItems.length} lines`} />
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.product_id} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">{item.name}</p>
                      <p className="text-xs font-mono text-zinc-500">{fmt(item.unit_price)} / unit</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <UiButton variant="ghost" size="sm" className="h-8 w-8 px-0" onClick={() => updateQty(item.product_id, item.quantity - 1)}>-</UiButton>
                      <span className="w-6 text-center font-mono text-sm text-white">{item.quantity}</span>
                      <UiButton variant="ghost" size="sm" className="h-8 w-8 px-0" onClick={() => updateQty(item.product_id, item.quantity + 1)}>+</UiButton>
                    </div>
                    <p className="w-24 text-right font-mono text-sm text-emerald-400">{fmt(item.unit_price * item.quantity)}</p>
                  </div>
                ))}
              </div>
            </UiCard>
          )}

          <UiCard className="space-y-3 p-4">
            <UiSectionTitle title="Discount" />
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">Apply discount</p>
              <UiButton variant={discountEnabled ? "primary" : "secondary"} size="sm" onClick={() => { setDiscountEnabled(!discountEnabled); setDiscountValue("") }}>
                {discountEnabled ? "On" : "Off"}
              </UiButton>
            </div>
            {discountEnabled && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <UiButton variant={discountType === "pct" ? "primary" : "secondary"} size="sm" className="flex-1" onClick={() => { setDiscountType("pct"); setDiscountValue("") }}>% Percentage</UiButton>
                  <UiButton variant={discountType === "fixed" ? "primary" : "secondary"} size="sm" className="flex-1" onClick={() => { setDiscountType("fixed"); setDiscountValue("") }}>KES Fixed</UiButton>
                </div>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(event) => setDiscountValue(event.target.value)}
                  placeholder={discountType === "pct" ? "e.g. 10" : "e.g. 200"}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500"
                />
              </div>
            )}
          </UiCard>

          <UiCard className="space-y-3 p-4">
            <UiSectionTitle title="Payment" />
            <div className="flex gap-2">
              {['cash', 'mpesa', 'bank'].map((method) => (
                <UiButton key={method} variant={paymentAccount === method ? "primary" : "secondary"} size="sm" className="flex-1 capitalize" onClick={() => setPaymentAccount(method)}>
                  <div className="flex items-center justify-center gap-2">
                    <PaymentIcon type={method} className="h-4 w-4 text-zinc-200" />
                    <span>{method === "mpesa" ? "M-Pesa" : method.charAt(0).toUpperCase() + method.slice(1)}</span>
                  </div>
                </UiButton>
              ))}
            </div>
          </UiCard>

          <UiCard className="space-y-3 p-4 opacity-90">
            <UiSectionTitle title="Tax & eTIMS" caption="Kept for future rollout" />
            <label className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
              <span className="text-xs text-zinc-400">Apply VAT</span>
              <input type="checkbox" checked={vatApplied} onChange={(event) => setVatApplied(event.target.checked)} disabled className="accent-emerald-500" />
            </label>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">VAT Rate (%)</label>
              <input type="number" value={vatRate} onChange={(event) => setVatRate(Number(event.target.value) || 0)} disabled className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-500 outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">eTIMS Receipt No</label>
              <input type="text" value={etimsNo} onChange={(event) => setEtimsNo(event.target.value)} placeholder="Will be enabled in future" disabled className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-500 outline-none placeholder:text-zinc-600" />
            </div>
          </UiCard>

          <UiCard className="space-y-2 p-4">
            <UiSectionTitle title="Total" />
            <div className="flex justify-between"><p className="text-sm text-zinc-400">Subtotal</p><p className="font-mono text-sm text-white">{fmt(subtotal)}</p></div>
            {discountAmount > 0 && <div className="flex justify-between"><p className="text-sm text-zinc-400">Discount {discountType === "pct" ? `(${discountValue}%)` : ""}</p><p className="font-mono text-sm text-red-400">-{fmt(discountAmount)}</p></div>}
            {vatApplied && <div className="flex justify-between"><p className="text-sm text-zinc-400">VAT ({vatRate}%)</p><p className="font-mono text-sm text-white">{fmt(vatAmount)}</p></div>}
            <div className="mt-2 flex justify-between border-t border-zinc-800 pt-2"><p className="text-sm font-semibold text-white">Total</p><p className="font-mono font-bold text-emerald-400">{fmt(total)}</p></div>
          </UiCard>
        </div>

        <div className="space-y-4 self-start lg:sticky lg:top-6">
          <UiCard className="p-5">
            <UiSectionTitle title="Live receipt" caption="What the customer will see" />
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><p className="text-zinc-500">Items</p><p className="font-mono text-zinc-200">{itemCount}</p></div>
              <div className="flex items-center justify-between"><p className="text-zinc-500">Lines</p><p className="font-mono text-zinc-200">{cartItems.length}</p></div>
              <div className="flex items-center justify-between"><p className="text-zinc-500">Payment</p><p className="capitalize text-zinc-200">{paymentAccount}</p></div>
              <div className="flex items-center justify-between border-t border-zinc-800 pt-2"><p className="text-zinc-500">Final total</p><p className="font-mono font-bold text-emerald-400">{fmt(total)}</p></div>
            </div>
          </UiCard>

          <UiCard className="p-5">
            <UiSectionTitle title="Confidence checklist" />
            {[
              { ok: cartItems.length > 0, text: "At least one product added" },
              { ok: !discountEnabled || discountValue !== "", text: "Discount value provided if enabled" },
              { ok: !!paymentAccount, text: "Payment account selected" },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between py-1 text-xs">
                <p className={item.ok ? "text-zinc-300" : "text-zinc-600"}>{item.text}</p>
                <span className={item.ok ? "text-emerald-400" : "text-zinc-700"}>{item.ok ? "?" : "�"}</span>
              </div>
            ))}
          </UiCard>
        </div>
      </div>

      <div className="fixed bottom-24 left-4 right-4 z-30 md:hidden">
        <UiButton variant="primary" className="w-full" onClick={handleSubmit} disabled={loading || cartItems.length === 0}>
          {loading ? "Recording..." : `Record sale � ${fmt(total)}`}
        </UiButton>
      </div>

      <div className="hidden md:flex md:justify-end md:gap-2 md:sticky md:bottom-6 md:right-6 md:pr-6">
        <UiButton variant="primary" className="px-6 py-3" onClick={handleSubmit} disabled={loading || cartItems.length === 0}>
          {loading ? "Recording..." : `Record sale � ${fmt(total)}`}
        </UiButton>
      </div>
    </AppShell>
  )
}
