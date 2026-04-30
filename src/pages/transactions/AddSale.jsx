// src/pages/transactions/AddSale.jsx
import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import { AppShell, UiButton, UiCard, UiSectionTitle } from "../../components/ui"
import PaymentIcon from "../../components/ui/PaymentIcon"

export default function AddSale() {
  const navigate = useNavigate()
  const [businessId, setBusinessId] = useState(null)
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

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase
      .from("users")
      .select("business_id, businesses(vat_rate)")
      .eq("id", user.id)
      .single()

    setBusinessId(userData.business_id)
    setUserId(user.id)

    const { data } = await supabase
      .from("products")
      .select("id, name, sku_id, selling_price, current_quantity, unit_of_measure, vat_type")
      .eq("business_id", userData.business_id)
      .eq("is_active", true)
      .order("name")

    setProducts(data || [])
  }

  const addToCart = (product) => {
    const existing = cartItems.find(i => i.product_id === product.id)
    if (existing) {
      setCartItems(cartItems.map(i =>
        i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
      ))
    } else {
      setCartItems([...cartItems, {
        product_id: product.id,
        name: product.name,
        unit_price: product.selling_price,
        vat_type: product.vat_type,
        quantity: 1,
        max_quantity: product.current_quantity,
      }])
    }
    setProductSearch("")
  }

  const updateQty = (productId, qty) => {
    if (qty <= 0) {
      setCartItems(cartItems.filter(i => i.product_id !== productId))
    } else {
      setCartItems(cartItems.map(i =>
        i.product_id === productId ? { ...i, quantity: qty } : i
      ))
    }
  }

 const subtotal = cartItems.reduce((s, i) => s + (i.unit_price * i.quantity), 0)
   
 const discountAmount = discountEnabled
  ? discountType === "pct"
    ? subtotal * ((parseFloat(discountValue) || 0) / 100)
    : Math.min(parseFloat(discountValue) || 0, subtotal)
  : 0

  const vatAmount = cartItems.reduce((s, i) => {
    const lineTotal = i.unit_price * i.quantity
    if (i.vat_type === "exclusive") return s + lineTotal * (vatRate / 100)
    if (i.vat_type === "inclusive") return s + lineTotal * (16 / 116)
    return s
  }, 0)

  const total = subtotal - discountAmount + cartItems.reduce((s, i) => {
  const lineTotal = i.unit_price * i.quantity
  if (i.vat_type === "exclusive") return s + lineTotal * (vatRate / 100)
  return s
 }, 0)
  const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0)

  const fmt = (n) => `KES ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`

  const handleSubmit = async () => {
    if (cartItems.length === 0) {
      setError("Add at least one product")
      return
    }
    setLoading(true)
    setError("")

    // Create transaction
    const { data: txn, error: txnError } = await supabase
      .from("transactions")
      .insert({
        business_id: businessId,
        type: "sale",
        transaction_type_tag: "income",
        payment_account: paymentAccount,
        account_code: "4100",
        date: new Date().toISOString(),
        created_by: userId,
      })
      .select()
      .single()

    if (txnError) {
      setError(txnError.message)
      setLoading(false)
      return
    }

    console.log(cartItems)

    // Create sale items
    const items = cartItems.map(i => ({
      transaction_id: txn.id,
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_amount: i.unit_price * i.quantity,
      vat_applied: i.vat_type !== "exempt" ? 1 : 0,
      etims_receipt_no: etimsNo || null,
    }))

     

    const { error: itemsError } = await supabase.from("sale_items").insert(items)

    if (itemsError) {
      setError(itemsError.message)
      setLoading(false)
      return
    }

    const updates = cartItems.map(i =>
    supabase.rpc("decrement_stock", {
    product_id: i.product_id,
    amount: i.quantity
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
            <span className="text-emerald-500 text-3xl">✓</span>
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
              View all
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppShell
      title="New Sale"
      subtitle="Record a sale transaction"
      contentClassName="max-w-6xl"
      right={<UiButton variant="secondary" size="sm" onClick={() => navigate("/transactions")}>← Back</UiButton>}
    >
      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}

          <UiCard className="p-4 space-y-3">
            <UiSectionTitle title="Add products" caption="Search and build the cart" />
            <input
              type="text"
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              placeholder="Search product name or SKU..."
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
            />
            {productSearch && (
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {products
                  .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku_id.toLowerCase().includes(productSearch.toLowerCase()))
                  .map(p => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="w-full text-left flex items-center justify-between px-4 py-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-colors"
                    >
                      <div>
                        <p className="text-white text-sm">{p.name}</p>
                        <p className="text-zinc-500 text-xs">{p.current_quantity} in stock</p>
                      </div>
                      <p className="text-emerald-400 text-sm font-mono">{fmt(p.selling_price)}</p>
                    </button>
                  ))}
              </div>
            )}
          </UiCard>

          {cartItems.length > 0 && (
            <UiCard className="p-4 space-y-3">
              <UiSectionTitle title="Cart" caption={`${itemCount} items across ${cartItems.length} lines`} />
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.product_id} className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-950/60 border border-zinc-800 px-3 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{item.name}</p>
                      <p className="text-zinc-500 text-xs font-mono">{fmt(item.unit_price)} / unit</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <UiButton variant="ghost" size="sm" className="h-8 w-8 px-0" onClick={() => updateQty(item.product_id, item.quantity - 1)}>−</UiButton>
                      <span className="text-white text-sm font-mono w-6 text-center">{item.quantity}</span>
                      <UiButton variant="ghost" size="sm" className="h-8 w-8 px-0" onClick={() => updateQty(item.product_id, item.quantity + 1)}>+</UiButton>
                    </div>
                    <p className="text-emerald-400 text-sm font-mono w-24 text-right">{fmt(item.unit_price * item.quantity)}</p>
                  </div>
                ))}
              </div>
            </UiCard>
          )}

          <UiCard className="p-4 space-y-3">
            <UiSectionTitle title="Discount" />
            <div className="flex items-center justify-between">
              <p className="text-zinc-400 text-sm">Apply discount</p>
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
                  onChange={e => setDiscountValue(e.target.value)}
                  placeholder={discountType === "pct" ? "e.g. 10" : "e.g. 200"}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
                />
              </div>
            )}
          </UiCard>

          <UiCard className="p-4 space-y-3">
            <UiSectionTitle title="Payment" />
            <div className="flex gap-2">
              {["cash", "mpesa", "bank"].map(method => (
                <UiButton key={method} variant={paymentAccount === method ? "primary" : "secondary"} size="sm" className="flex-1 capitalize" onClick={() => setPaymentAccount(method)}>
                  <div className="flex items-center justify-center gap-2">
                    <PaymentIcon type={method} className="h-4 w-4 text-zinc-200" />
                    <span>{method === "mpesa" ? "M-Pesa" : method.charAt(0).toUpperCase() + method.slice(1)}</span>
                  </div>
                </UiButton>
              ))}
            </div>
          </UiCard>

          <UiCard className="p-4 space-y-3 opacity-90">
            <UiSectionTitle title="Tax & eTIMS" caption="Kept for future rollout" />
            <label className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2">
              <span className="text-zinc-400 text-xs">Apply VAT</span>
              <input type="checkbox" checked={vatApplied} onChange={(e) => setVatApplied(e.target.checked)} disabled className="accent-emerald-500" />
            </label>
            <div>
              <label className="text-zinc-500 text-xs mb-1 block">VAT Rate (%)</label>
              <input type="number" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value) || 0)} disabled className="w-full bg-zinc-950 border border-zinc-800 text-zinc-500 rounded-xl px-4 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-zinc-500 text-xs mb-1 block">eTIMS Receipt No</label>
              <input type="text" value={etimsNo} onChange={(e) => setEtimsNo(e.target.value)} placeholder="Will be enabled in future" disabled className="w-full bg-zinc-950 border border-zinc-800 text-zinc-500 rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-zinc-600" />
            </div>
          </UiCard>

          <UiCard className="p-4 space-y-2">
            <UiSectionTitle title="Total" />
            <div className="flex justify-between"><p className="text-zinc-400 text-sm">Subtotal</p><p className="text-white text-sm font-mono">{fmt(subtotal)}</p></div>
            {discountAmount > 0 && <div className="flex justify-between"><p className="text-zinc-400 text-sm">Discount {discountType === "pct" ? `(${discountValue}%)` : ""}</p><p className="text-red-400 text-sm font-mono">-{fmt(discountAmount)}</p></div>}
            {vatApplied && <div className="flex justify-between"><p className="text-zinc-400 text-sm">VAT ({vatRate}%)</p><p className="text-white text-sm font-mono">{fmt(vatAmount)}</p></div>}
            <div className="flex justify-between border-t border-zinc-800 pt-2 mt-2"><p className="text-white font-semibold text-sm">Total</p><p className="text-emerald-400 font-bold font-mono">{fmt(total)}</p></div>
          </UiCard>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 self-start">
          <UiCard className="p-5">
            <UiSectionTitle title="Live receipt" caption="What the customer will see" />
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><p className="text-zinc-500">Items</p><p className="text-zinc-200 font-mono">{itemCount}</p></div>
              <div className="flex items-center justify-between"><p className="text-zinc-500">Lines</p><p className="text-zinc-200 font-mono">{cartItems.length}</p></div>
              <div className="flex items-center justify-between"><p className="text-zinc-500">Payment</p><p className="text-zinc-200 capitalize">{paymentAccount}</p></div>
              <div className="flex items-center justify-between border-t border-zinc-800 pt-2"><p className="text-zinc-500">Final total</p><p className="text-emerald-400 font-bold font-mono">{fmt(total)}</p></div>
            </div>
          </UiCard>

          <UiCard className="p-5">
            <UiSectionTitle title="Confidence checklist" />
            {[
              { ok: cartItems.length > 0, text: "At least one product added" },
              { ok: !discountEnabled || discountValue !== "", text: "Discount value provided if enabled" },
              { ok: !!paymentAccount, text: "Payment account selected" },
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
        <UiButton variant="primary" className="w-full" onClick={handleSubmit} disabled={loading || cartItems.length === 0}>
          {loading ? "Recording..." : `Record sale · ${fmt(total)}`}
        </UiButton>
      </div>

      {/* Desktop CTA: visible on md and larger */}
      <div className="hidden md:flex md:justify-end md:gap-2 md:sticky md:bottom-6 md:right-6 md:pr-6">
        <UiButton variant="primary" className="px-6 py-3" onClick={handleSubmit} disabled={loading || cartItems.length === 0}>
          {loading ? "Recording..." : `Record sale · ${fmt(total)}`}
        </UiButton>
      </div>
    </AppShell>
  )
}