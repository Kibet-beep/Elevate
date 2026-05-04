import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AppShell, UiButton, UiCard, UiSectionTitle } from "../../components/ui"
import PaymentIcon from "../../components/ui/PaymentIcon"
import { useBranchContext } from "../../hooks/useBranchContext"
import { useCurrentBusiness, useUser } from "../../hooks/useRole"
import { supabase } from "../../lib/supabase"

export default function HistoricalSales() {
  const navigate = useNavigate()
  const { user: authUser } = useUser()
  const { businessId } = useCurrentBusiness()
  const {
    currentBranchId,
    viewMode,
    canViewAll,
    activeBranch,
    availableBranches,
    setActiveBranch,
    showAllBranches,
    isOwner,
  } = useBranchContext()

  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [openingDate, setOpeningDate] = useState(null)
  const [products, setProducts] = useState([])
  const [productSearch, setProductSearch] = useState("")
  const [cartItems, setCartItems] = useState([])
  const [paymentAccount, setPaymentAccount] = useState("cash")
  const [discountEnabled, setDiscountEnabled] = useState(false)
  const [discountType, setDiscountType] = useState("pct")
  const [discountValue, setDiscountValue] = useState("")
  const [pendingTransactions, setPendingTransactions] = useState([])
  const [showPendingReview, setShowPendingReview] = useState(false)

  const [datesWithSales, setDatesWithSales] = useState({})
  const [todaysSales, setTodaysSales] = useState([])

  const resolvedBranchId = currentBranchId || activeBranch?.id || null
  const allBranchesLabel = isOwner ? "All Branches" : "All My Branches"

  useEffect(() => {
    if (businessId && authUser) {
      fetchInitialData()
    }
  }, [businessId, authUser, currentBranchId, viewMode, selectedDate])

  const fetchInitialData = async () => {
    try {
      const { data: baseline } = await supabase
        .from("float_baseline")
        .select("opening_stock_date")
        .eq("business_id", businessId)
        .maybeSingle()

      if (!baseline?.opening_stock_date) {
        setOpeningDate(null)
        setError("Opening stock not set. Please set opening stock first.")
        return
      }

      setOpeningDate(baseline.opening_stock_date)
      setUserId(authUser.id)
      setError("")

      let productsQuery = supabase
        .from("products")
        .select("id, name, sku_id, selling_price, current_quantity, unit_of_measure, vat_type, branch_id")
        .eq("business_id", businessId)
        .not("is_active", "eq", false)
        .order("name")

      if (viewMode === "branch" && resolvedBranchId) {
        productsQuery = productsQuery.or(`branch_id.eq.${resolvedBranchId},branch_id.is.null`)
      }

      const { data: productsData, error: productsError } = await productsQuery
      if (productsError) throw productsError
      setProducts(productsData || [])

      const { data: transactions, error: transactionsError } = await supabase
        .from("transactions")
        .select("id, date, payment_account, sale_items(product_id, quantity, unit_price, total_amount)")
        .eq("business_id", businessId)
        .eq("type", "sale")
        .gte("date", `${baseline.opening_stock_date}T00:00:00.000Z`)
        .lte("date", `${selectedDate}T23:59:59.999Z`)
        .order("date", { ascending: true })

      if (transactionsError) throw transactionsError

      const grouped = {}
      const normalizedTransactions =
        transactions?.flatMap((txn) => {
          const items = Array.isArray(txn.sale_items) ? txn.sale_items : []
          return items.map((item, index) => ({
            id: `${txn.id}-${index}`,
            transaction_id: txn.id,
            transaction_date: new Date(txn.date).toISOString().split("T")[0],
            payment_account: txn.payment_account,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_amount: item.total_amount,
          }))
        }) || []

      normalizedTransactions.forEach((item) => {
        const date = item.transaction_date
        if (!grouped[date]) grouped[date] = []
        grouped[date].push(item)
      })

      setDatesWithSales(grouped)
      setTodaysSales(grouped[selectedDate] || [])
    } catch (err) {
      setError(err.message || "Failed to load historical sales")
    }
  }

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase()
    if (!search) return []
    return products.filter((product) => {
      return (
        product.name?.toLowerCase().includes(search) ||
        product.sku_id?.toLowerCase().includes(search)
      )
    })
  }, [productSearch, products])

  const subtotal = cartItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const discountAmount = discountEnabled
    ? discountType === "pct"
      ? subtotal * ((parseFloat(discountValue) || 0) / 100)
      : Math.min(parseFloat(discountValue) || 0, subtotal)
    : 0
  const total = subtotal - discountAmount
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  const pendingRows = pendingTransactions
    .flatMap((transaction) =>
      transaction.items.map((item) => ({
        transactionId: transaction.id,
        date: transaction.date,
        branchName: transaction.branchName,
        paymentAccount: transaction.paymentAccount,
        ...item,
      }))
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  const fmt = (value) =>
    `KES ${Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat("en-KE", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  const resetComposer = () => {
    setCartItems([])
    setDiscountEnabled(false)
    setDiscountType("pct")
    setDiscountValue("")
    setProductSearch("")
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
      setCartItems((current) => [
        ...current,
        {
          product_id: product.id,
          name: product.name,
          sku_id: product.sku_id,
          unit_price: Number(product.selling_price || 0),
          quantity: 1,
          max_quantity: Number(product.current_quantity || 0),
        },
      ])
    }
    setProductSearch("")
  }

  const updateQty = (productId, qty) => {
    if (qty <= 0) {
      setCartItems((current) => current.filter((item) => item.product_id !== productId))
      return
    }

    setCartItems((current) =>
      current.map((item) => (item.product_id === productId ? { ...item, quantity: qty } : item))
    )
  }

  const handleRecordSale = () => {
    if (cartItems.length === 0) {
      setError("Add at least one product")
      return
    }

    if (canViewAll && viewMode !== "branch" && !resolvedBranchId) {
      setError("Select a branch before recording a sale")
      return
    }

    if (openingDate && selectedDate < openingDate) {
      setError("Sale date cannot be before opening stock date")
      return
    }

    setError("")

    const pendingTransaction = {
      id: `${selectedDate}-${Date.now()}`,
      date: selectedDate,
      branchId: resolvedBranchId,
      branchName: activeBranch?.name || "Unassigned branch",
      paymentAccount,
      subtotal,
      discountAmount,
      total,
      items: cartItems.map((item) => ({
        product_id: item.product_id,
        name: item.name,
        sku_id: item.sku_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_amount: item.unit_price * item.quantity,
      })),
    }

    setPendingTransactions((current) => [...current, pendingTransaction])
    resetComposer()
  }

  const handleSubmit = async () => {
    if (pendingTransactions.length === 0) {
      setError("Record at least one staged sale first")
      return
    }

    setLoading(true)
    setError("")

    try {
      for (const stagedTransaction of pendingTransactions) {
        const transactionDate = new Date(`${stagedTransaction.date}T12:00:00Z`).toISOString()
        const { data: txn, error: txnError } = await supabase
          .from("transactions")
          .insert({
            business_id: businessId,
            branch_id: stagedTransaction.branchId,
            type: "sale",
            transaction_type_tag: "income",
            payment_account: stagedTransaction.paymentAccount,
            account_code: "4100",
            date: transactionDate,
            created_by: userId,
          })
          .select()
          .single()

        if (txnError) throw txnError

        const items = stagedTransaction.items.map((item) => ({
          transaction_id: txn.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_amount: item.total_amount,
          vat_applied: 0,
          etims_receipt_no: null,
        }))

        const { error: itemsError } = await supabase.from("sale_items").insert(items)
        if (itemsError) throw itemsError

        const stockUpdates = stagedTransaction.items.map((item) =>
          supabase.rpc("decrement_stock", {
            product_id: item.product_id,
            amount: item.quantity,
          })
        )

        await Promise.all(stockUpdates)
      }

      setPendingTransactions([])
      setShowPendingReview(false)
      resetComposer()
      await fetchInitialData()
    } catch (err) {
      setError(err.message || "Failed to submit transactions")
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => navigate("/settings", { replace: true })

  if (showPendingReview) {
    return (
      <AppShell
        title="Complete transactions"
        subtitle="Review staged sales before final submission"
        contentClassName="max-w-6xl"
        right={
          <UiButton variant="secondary" size="sm" onClick={() => setShowPendingReview(false)}>
            Back
          </UiButton>
        }
      >
        <div className="space-y-4">
          {error && <p className="rounded-lg bg-red-400/10 px-3 py-2 text-sm text-red-400">{error}</p>}

          <UiCard className="space-y-3 p-4">
            <UiSectionTitle
              title="Transactions table"
              caption={`${pendingRows.length} line${pendingRows.length !== 1 ? "s" : ""} across ${pendingTransactions.length} staged sale${pendingTransactions.length !== 1 ? "s" : ""}`}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                    <th className="py-3 pr-4 font-medium">Date</th>
                    <th className="py-3 pr-4 font-medium">Product</th>
                    <th className="py-3 pr-4 font-medium">SKU</th>
                    <th className="py-3 pr-4 font-medium">Branch</th>
                    <th className="py-3 pr-4 font-medium">Payment</th>
                    <th className="py-3 px-2 text-right font-medium">Qty</th>
                    <th className="py-3 px-2 text-right font-medium">Unit price</th>
                    <th className="py-3 pl-2 text-right font-medium">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRows.map((row, index) => (
                    <tr
                      key={`${row.transactionId}-${row.product_id}-${index}`}
                      className="border-b border-zinc-900"
                    >
                      <td className="py-3 pr-4 font-mono text-sm text-zinc-300">{row.date}</td>
                      <td className="py-3 pr-4 text-sm text-white">{row.name}</td>
                      <td className="py-3 pr-4 text-sm text-zinc-300">{row.sku_id || "-"}</td>
                      <td className="py-3 pr-4 text-sm text-zinc-300">{row.branchName}</td>
                      <td className="py-3 pr-4 text-sm capitalize text-zinc-300">{row.paymentAccount}</td>
                      <td className="py-3 px-2 text-right font-mono text-sm text-zinc-300">{row.quantity}</td>
                      <td className="py-3 px-2 text-right font-mono text-sm text-zinc-300">{fmt(row.unit_price)}</td>
                      <td className="py-3 pl-2 text-right font-mono text-sm text-emerald-400">{fmt(row.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </UiCard>

          <UiCard className="space-y-2 p-4">
            <UiSectionTitle title="Summary" />
            <div className="flex justify-between">
              <p className="text-sm text-zinc-400">Transactions</p>
              <p className="font-mono text-sm text-white">{pendingTransactions.length}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-sm text-zinc-400">Lines</p>
              <p className="font-mono text-sm text-white">{pendingRows.length}</p>
            </div>
            <div className="mt-2 flex justify-between border-t border-zinc-800 pt-2">
              <p className="text-sm font-semibold text-white">Grand total</p>
              <p className="font-mono font-bold text-emerald-400">
                {fmt(pendingTransactions.reduce((sum, transaction) => sum + transaction.total, 0))}
              </p>
            </div>
          </UiCard>

          <div className="flex justify-end">
            <UiButton
              variant="primary"
              className="px-6 py-3"
              onClick={handleSubmit}
              disabled={loading || pendingTransactions.length === 0}
            >
              {loading ? "Submitting..." : "Submit"}
            </UiButton>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Historical sales"
      subtitle={
        activeBranch
          ? `${activeBranch.name} · Backdate sales with the regular sale flow`
          : "Backdate sales with the regular sale flow"
      }
      showHeader={true}
      contentClassName="max-w-6xl"
      right={
        <div className="flex w-full flex-wrap items-stretch gap-1.5 sm:w-auto sm:items-center sm:gap-3">
          <UiButton
            variant="secondary"
            size="sm"
            onClick={goBack}
            className="flex-1 px-2 text-xs sm:flex-none sm:px-3"
          >
            Settings
          </UiButton>
          {canViewAll && (
            <select
              value={viewMode === "all" ? "all" : activeBranch?.id || ""}
              onChange={(e) => {
                if (e.target.value === "all") {
                  showAllBranches()
                } else {
                  const branch = availableBranches.find((item) => item.id === e.target.value)
                  if (branch) setActiveBranch(branch)
                }
              }}
              className="cursor-pointer appearance-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white transition-colors hover:bg-zinc-700 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">{allBranchesLabel}</option>
              {availableBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} {branch.code ? `(${branch.code})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          {error && <p className="rounded-lg bg-red-400/10 px-3 py-2 text-sm text-red-400">{error}</p>}

          {!openingDate && (
            <p className="rounded-lg bg-yellow-400/10 px-3 py-2 text-sm text-yellow-400">
              Opening stock not set. Go back and set opening inventory first.
            </p>
          )}

          {openingDate && (
            <>
              {canViewAll && viewMode !== "branch" && !resolvedBranchId && (
                <UiCard className="space-y-3 border-amber-400/20 bg-amber-400/5 p-4">
                  <UiSectionTitle
                    title="Choose branch"
                    caption="Historical sales are recorded per branch"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-zinc-300">
                      Pick the branch you want to backdate sales for before submitting.
                    </p>
                    <div className="shrink-0">
                      <select
                        value={viewMode === "all" ? "all" : activeBranch?.id || ""}
                        onChange={(e) => {
                          if (e.target.value === "all") {
                            showAllBranches()
                          } else {
                            const branch = availableBranches.find((item) => item.id === e.target.value)
                            if (branch) setActiveBranch(branch)
                          }
                        }}
                        className="cursor-pointer appearance-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white transition-colors hover:bg-zinc-700 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="all">{allBranchesLabel}</option>
                        {availableBranches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name} {branch.code ? `(${branch.code})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </UiCard>
              )}

              <UiCard className="space-y-3 p-4">
                <UiSectionTitle title="Sale date" caption="Record a past sale after opening stock" />
                <div className="flex items-center justify-between gap-3">
                  <input
                    type="date"
                    min={openingDate}
                    max={new Date().toISOString().split("T")[0]}
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-500"
                  />
                  <p className="hidden whitespace-nowrap text-sm text-zinc-500 sm:block">
                    {formatDate(selectedDate)}
                  </p>
                </div>
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
                    {filteredProducts.length === 0 ? (
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-500">
                        No matching products found.
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => addToCart(product)}
                          className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-left transition-colors hover:border-zinc-700"
                        >
                          <div>
                            <p className="text-sm text-white">{product.name}</p>
                            <p className="text-xs text-zinc-500">
                              {product.sku_id || "No SKU"} · {product.current_quantity || 0} in stock
                            </p>
                          </div>
                          <p className="text-sm font-mono text-emerald-400">
                            {fmt(product.selling_price)}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </UiCard>

              {cartItems.length > 0 && (
                <UiCard className="space-y-3 p-4">
                  <UiSectionTitle
                    title="Cart"
                    caption={`${itemCount} items across ${cartItems.length} lines`}
                  />
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div
                        key={item.product_id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-3 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-white">{item.name}</p>
                          <p className="text-xs text-zinc-500">
                            {item.sku_id || "No SKU"} · {fmt(item.unit_price)} / unit
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <UiButton
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 px-0"
                            onClick={() => updateQty(item.product_id, item.quantity - 1)}
                          >
                            -
                          </UiButton>
                          <span className="w-6 text-center font-mono text-sm text-white">
                            {item.quantity}
                          </span>
                          <UiButton
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 px-0"
                            onClick={() => updateQty(item.product_id, item.quantity + 1)}
                          >
                            +
                          </UiButton>
                        </div>
                        <p className="w-24 text-right font-mono text-sm text-emerald-400">
                          {fmt(item.unit_price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </UiCard>
              )}

              {cartItems.length > 0 && (
                <UiCard className="space-y-3 p-4">
                  <UiSectionTitle
                    title="Sales to record"
                    caption="Review the current sale before you record it"
                  />
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px]">
                      <thead>
                        <tr className="border-b border-zinc-800 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                          <th className="py-3 pr-4 font-medium">Product</th>
                          <th className="py-3 pr-4 font-medium">SKU</th>
                          <th className="py-3 px-2 text-right font-medium">Qty</th>
                          <th className="py-3 px-2 text-right font-medium">Unit price</th>
                          <th className="py-3 pl-2 text-right font-medium">Line total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cartItems.map((item) => (
                          <tr key={item.product_id} className="border-b border-zinc-900">
                            <td className="py-3 pr-4 text-sm text-white">{item.name}</td>
                            <td className="py-3 pr-4 text-sm text-zinc-300">{item.sku_id || "-"}</td>
                            <td className="py-3 px-2 text-right font-mono text-sm text-zinc-300">
                              {item.quantity}
                            </td>
                            <td className="py-3 px-2 text-right font-mono text-sm text-zinc-300">
                              {fmt(item.unit_price)}
                            </td>
                            <td className="py-3 pl-2 text-right font-mono text-sm text-emerald-400">
                              {fmt(item.unit_price * item.quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="space-y-2 border-t border-zinc-800 pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Date</span>
                      <span className="font-mono text-zinc-200">{selectedDate}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Branch</span>
                      <span className="text-zinc-200">{activeBranch?.name || "Select branch"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Payment</span>
                      <span className="capitalize text-zinc-200">{paymentAccount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Subtotal</span>
                      <span className="font-mono text-zinc-200">{fmt(subtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Discount</span>
                        <span className="font-mono text-red-400">-{fmt(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-zinc-800 pt-2 text-sm">
                      <span className="font-medium text-white">Final total</span>
                      <span className="font-mono font-bold text-emerald-400">{fmt(total)}</span>
                    </div>
                  </div>
                </UiCard>
              )}

              <UiCard className="space-y-3 p-4">
                <UiSectionTitle title="Discount" />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">Apply discount</p>
                  <UiButton
                    variant={discountEnabled ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => {
                      setDiscountEnabled(!discountEnabled)
                      setDiscountValue("")
                    }}
                  >
                    {discountEnabled ? "On" : "Off"}
                  </UiButton>
                </div>
                {discountEnabled && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <UiButton
                        variant={discountType === "pct" ? "primary" : "secondary"}
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setDiscountType("pct")
                          setDiscountValue("")
                        }}
                      >
                        % Percentage
                      </UiButton>
                      <UiButton
                        variant={discountType === "fixed" ? "primary" : "secondary"}
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setDiscountType("fixed")
                          setDiscountValue("")
                        }}
                      >
                        KES Fixed
                      </UiButton>
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
                  {["cash", "mpesa", "bank"].map((method) => (
                    <UiButton
                      key={method}
                      variant={paymentAccount === method ? "primary" : "secondary"}
                      size="sm"
                      className="flex-1 capitalize"
                      onClick={() => setPaymentAccount(method)}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <PaymentIcon type={method} className="h-4 w-4 text-zinc-200" />
                        <span>
                          {method === "mpesa"
                            ? "M-Pesa"
                            : method.charAt(0).toUpperCase() + method.slice(1)}
                        </span>
                      </div>
                    </UiButton>
                  ))}
                </div>
              </UiCard>

              <UiCard className="space-y-2 p-4">
                <UiSectionTitle title="Total" />
                <div className="flex justify-between">
                  <p className="text-sm text-zinc-400">Subtotal</p>
                  <p className="font-mono text-sm text-white">{fmt(subtotal)}</p>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between">
                    <p className="text-sm text-zinc-400">
                      Discount {discountType === "pct" ? `(${discountValue}%)` : ""}
                    </p>
                    <p className="font-mono text-sm text-red-400">-{fmt(discountAmount)}</p>
                  </div>
                )}
                <div className="mt-2 flex justify-between border-t border-zinc-800 pt-2">
                  <p className="text-sm font-semibold text-white">Total</p>
                  <p className="font-mono font-bold text-emerald-400">{fmt(total)}</p>
                </div>
              </UiCard>

              {todaysSales.length > 0 && (
                <UiCard className="space-y-3 p-4">
                  <UiSectionTitle
                    title={`Sales entered for ${formatDate(selectedDate)}`}
                    caption={`${todaysSales.length} line${todaysSales.length !== 1 ? "s" : ""}`}
                  />
                  <div className="space-y-2">
                    {todaysSales.map((sale) => {
                      const prod = products.find((product) => product.id === sale.product_id)
                      return (
                        <div
                          key={sale.id}
                          className="flex items-start justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">
                              {prod?.name || "Unknown product"}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {sale.quantity} x {fmt(sale.unit_price)}
                            </p>
                          </div>
                          <p className="text-sm font-mono text-emerald-400">
                            {fmt(sale.total_amount || sale.quantity * sale.unit_price)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                  <div className="border-t border-zinc-800 pt-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-zinc-500">Day total</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {fmt(
                          todaysSales.reduce(
                            (sum, sale) =>
                              sum + Number(sale.total_amount || sale.quantity * sale.unit_price),
                            0
                          )
                        )}
                      </span>
                    </div>
                  </div>
                </UiCard>
              )}

              {Object.keys(datesWithSales).length > 0 && (
                <UiCard className="space-y-3 p-4">
                  <UiSectionTitle
                    title="Dates with sales"
                    caption={`${Object.keys(datesWithSales).length} date${Object.keys(datesWithSales).length !== 1 ? "s" : ""}`}
                  />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {Object.entries(datesWithSales).map(([date, sales]) => (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`rounded-xl border p-3 text-center text-xs transition-colors ${
                          selectedDate === date
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                        }`}
                      >
                        <p className="font-medium text-white">{formatDate(date).split(" ")[0]}</p>
                        <p className="text-zinc-400">
                          {formatDate(date).split(" ").slice(1).join(" ")}
                        </p>
                        <p className="mt-1 text-xs text-emerald-400">{sales.length} lines</p>
                      </button>
                    ))}
                  </div>
                </UiCard>
              )}
            </>
          )}
        </div>

        <div className="space-y-4 self-start lg:sticky lg:top-6">
          <UiCard className="p-5">
            <UiSectionTitle title="Live receipt" caption="Backdated sale preview" />
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <p className="text-zinc-500">Date</p>
                <p className="font-mono text-zinc-200">{selectedDate}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-zinc-500">Items</p>
                <p className="font-mono text-zinc-200">{itemCount}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-zinc-500">Lines</p>
                <p className="font-mono text-zinc-200">{cartItems.length}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-zinc-500">Staged sales</p>
                <p className="font-mono text-zinc-200">{pendingTransactions.length}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-zinc-500">Payment</p>
                <p className="capitalize text-zinc-200">{paymentAccount}</p>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-800 pt-2">
                <p className="text-zinc-500">Final total</p>
                <p className="font-mono font-bold text-emerald-400">{fmt(total)}</p>
              </div>
            </div>
          </UiCard>

          <UiCard className="p-5">
            <UiSectionTitle title="Confidence checklist" />
            {[
              { ok: !!openingDate, text: "Opening stock exists" },
              { ok: cartItems.length > 0, text: "At least one product added" },
              { ok: !discountEnabled || discountValue !== "", text: "Discount value provided if enabled" },
              { ok: !!paymentAccount, text: "Payment account selected" },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between py-1 text-xs">
                <p className={item.ok ? "text-zinc-300" : "text-zinc-600"}>{item.text}</p>
                <span className={item.ok ? "text-emerald-400" : "text-zinc-700"}>
                  {item.ok ? "OK" : "..."}
                </span>
              </div>
            ))}
          </UiCard>

          <UiCard className="space-y-3 p-5">
            <UiSectionTitle
              title="Actions"
              caption={`${pendingTransactions.length} staged sale${pendingTransactions.length !== 1 ? "s" : ""} ready for review`}
            />
            <UiButton
              variant="primary"
              className="w-full"
              onClick={handleRecordSale}
              disabled={loading || cartItems.length === 0 || !openingDate}
            >
              {loading ? "Recording..." : `Record sale · ${fmt(total)}`}
            </UiButton>
            <UiButton
              variant="secondary"
              className="w-full"
              onClick={() => setShowPendingReview(true)}
              disabled={loading || pendingTransactions.length === 0}
            >
              Complete transactions
            </UiButton>
          </UiCard>
        </div>
      </div>

      <div className="fixed bottom-24 left-4 right-4 z-30 space-y-2 md:hidden">
        <UiButton
          variant="primary"
          className="w-full"
          onClick={handleRecordSale}
          disabled={loading || cartItems.length === 0 || !openingDate}
        >
          {loading ? "Recording..." : `Record sale · ${fmt(total)}`}
        </UiButton>
        <UiButton
          variant="secondary"
          className="w-full"
          onClick={() => setShowPendingReview(true)}
          disabled={loading || pendingTransactions.length === 0}
        >
          Complete transactions
        </UiButton>
      </div>
    </AppShell>
  )
}
