import { useState, useEffect, useMemo, useRef } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import { useUser, useCurrentBusiness } from "../../hooks/useRole"
import { useBranchContext } from "../../context/BranchContext"
import { AppShell, UiButton, UiCard, UiSectionTitle, CategorySelect } from "../../components/ui"
import { BranchSelector } from "../../components/BranchSelector"

export default function OpeningStock() {
  const navigate = useNavigate()
  const { user: authUser } = useUser()
  const { businessId } = useCurrentBusiness()
  const {
    canViewAll,
    availableBranches,
    effectiveBranchId,
    isOwner,
    isManager,
    readyToFetch,
  } = useBranchContext()
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const resolvedBranchId = effectiveBranchId

  // Product states
  const [existingProducts, setExistingProducts] = useState([])
  const [addedStock, setAddedStock] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productSearch, setProductSearch] = useState("")
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unitCost, setUnitCost] = useState("")
  const [sellingPrice, setSellingPrice] = useState("")
  const [additionalCosts, setAdditionalCosts] = useState([])
  const [openingDate, setOpeningDate] = useState("")
  const [step, setStep] = useState(1)
  const [isNewProduct, setIsNewProduct] = useState(true)
  const previousBranchIdRef = useRef(null)
  const defaultUnit = "pcs"
  const reservedSkus = new Set()

  const getAllBranchesLabel = () => {
    if (isOwner) return "All Branches"
    if (isManager) return "All My Branches"
    return "All Branches"
  }

  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set([
        ...existingProducts.map((product) => product.category).filter(Boolean),
        ...addedStock.map((item) => item.category).filter(Boolean),
      ])
    ).sort((a, b) => String(a).localeCompare(String(b)))
  }, [existingProducts, addedStock])

  useEffect(() => {
    if (businessId && authUser && readyToFetch) {
      fetchInitialData()
    }
  }, [businessId, authUser, resolvedBranchId, readyToFetch, canViewAll])

  useEffect(() => {
    const previousBranchId = previousBranchIdRef.current
    if (!previousBranchId) {
      previousBranchIdRef.current = resolvedBranchId
      return
    }

    if (resolvedBranchId && previousBranchId !== resolvedBranchId) {
      // Prevent cross-branch contamination when owner switches branch scope.
      setSelectedProduct(null)
      setProductSearch("")
      setAddedStock([])
      setStep(1)
      setError("")
    }

    previousBranchIdRef.current = resolvedBranchId
  }, [resolvedBranchId])

  const fetchInitialData = async () => {
    if (canViewAll && !resolvedBranchId) {
      setExistingProducts([])
      setError("Select a branch before setting opening stock")
      return
    }
    if (!resolvedBranchId) {
      setExistingProducts([])
      setError("Your branch is not assigned yet. Contact the owner.")
      return
    }

    setError("")
    setUserId(authUser.id)

    let query = supabase
      .from("products")
      .select("id, name, sku_id, selling_price, unit_of_measure, category, branch_id, branches!left(name, code)")
      .eq("business_id", businessId)
      .not("is_active", "eq", false)
      .order("name")

    query = query.eq("branch_id", resolvedBranchId)

    const { data: productsData } = await query
    setExistingProducts(productsData || [])
  }

  const generateSKU = (productName) => {
    const words = productName.trim().toUpperCase().split(" ")
    const base = words.map((w) => w.slice(0, 3)).join("-")
    const suffix = Math.floor(Math.random() * 900 + 100)
    return `${base}-${suffix}`
  }

  const generateUniqueSKU = (productName, reservedSkus) => {
    let candidate = generateSKU(productName)
    while (reservedSkus.has(candidate)) {
      candidate = generateSKU(productName)
    }
    reservedSkus.add(candidate)
    return candidate
  }

  const qty = parseFloat(quantity) || 0
  const cost = parseFloat(unitCost) || 0
  const additionalTotal = additionalCosts.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
  const totalLandedCost = (qty * cost) + additionalTotal
  const landedCostPerUnit = qty > 0 ? totalLandedCost / qty : 0
  const suggestedLow = Math.ceil(landedCostPerUnit * 1.4)
  const suggestedHigh = Math.ceil(landedCostPerUnit * 1.8)
  const sp = parseFloat(sellingPrice) || 0
  const profitPerUnit = sp - landedCostPerUnit
  const profitTotal = profitPerUnit * qty

  const canProceedStep1 = isNewProduct ? Boolean(name.trim()) : Boolean(selectedProduct)
  const canProceedStep2 = Boolean(quantity) && Boolean(unitCost)
  const canProceedStep3 = Boolean(sellingPrice)
  const canSubmit = canProceedStep1 && canProceedStep2 && canProceedStep3

  const fmt = (n) => `KES ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
  const fmtShort = (n) => `KES ${Math.round(n).toLocaleString("en-KE")}`

  const addCostLine = () => setAdditionalCosts([...additionalCosts, { label: "", amount: "" }])
  const updateCostLine = (index, field, value) => {
    const updated = [...additionalCosts]
    updated[index][field] = value
    setAdditionalCosts(updated)
  }
  const removeCostLine = (index) => setAdditionalCosts(additionalCosts.filter((_, i) => i !== index))

  const resetEntryForm = () => {
    setSelectedProduct(null)
    setProductSearch("")
    setName("")
    setCategory("")
    setQuantity("")
    setUnitCost("")
    setSellingPrice("")
    setAdditionalCosts([])
    setStep(1)
  }

  const handleAddProduct = () => {
    setError("")
    if (!quantity || !unitCost) { setError("Quantity and unit cost are required"); return }
    if (isNewProduct && !name) { setError("Product name is required"); return }
    if (!isNewProduct && !selectedProduct) { setError("Please select a product"); return }
    if (!sellingPrice) { setError("Selling price is required"); return }
    if (!resolvedBranchId) { setError("Select a branch before adding stock"); return }
    if (!isNewProduct && selectedProduct?.branch_id && selectedProduct.branch_id !== resolvedBranchId) {
      setError("Selected product does not belong to the active branch")
      return
    }

    setAddedStock([
      ...addedStock,
      {
        mode: isNewProduct ? "new" : "existing",
        productId: selectedProduct?.id || null,
        productName: isNewProduct ? name.trim() : selectedProduct.name,
        category: isNewProduct ? (category || null) : selectedProduct?.category || null,
        unit: isNewProduct ? defaultUnit : selectedProduct?.unit_of_measure || defaultUnit,
        quantity: qty,
        unitCost: cost,
        landedCostPerUnit,
        sellingPrice: sp,
        sku: isNewProduct ? generateSKU(name) : selectedProduct?.sku_id || null,
      },
    ])

    resetEntryForm()
  }

  const handleSaveBaseline = async () => {
    if (addedStock.length === 0) { setError("Add at least one product"); return }
    if (!openingDate) { setError("Select opening date"); return }

    if (canViewAll && !resolvedBranchId) { setError("Select a branch before saving baseline"); return }
    if (!resolvedBranchId) { setError("Your branch is not assigned yet. Contact the owner."); return }

    setLoading(true)
    setError("")

    try {
      const reservedSkus = new Set(existingProducts.map((product) => product.sku_id).filter(Boolean))
      const branchId = resolvedBranchId
      const stagedItems = addedStock.map((item, index) => ({ ...item, index }))
      const newItems = stagedItems.filter((item) => item.mode === "new")
      const existingItems = stagedItems.filter((item) => item.mode === "existing")

      const newProductPayload = newItems
        .map((item) => ({
          index: item.index,
          sku: generateUniqueSKU(item.productName, reservedSkus),
          business_id: businessId,
          branch_id: branchId,
          is_active: true,
          sku_id: null,
          name: item.productName,
          category: item.category,
          unit_of_measure: item.unit || defaultUnit,
          buying_price: item.landedCostPerUnit,
          selling_price: item.sellingPrice,
          current_quantity: item.quantity,
        }))
        .map((row) => ({
          ...row,
          sku_id: row.sku,
        }))

      let insertedProducts = []
      if (newProductPayload.length > 0) {
        const { data, error: insertError } = await supabase
          .from("products")
          .insert(newProductPayload.map(({ index, sku, ...row }) => row))
          .select("id, name, sku_id")

        if (insertError) throw insertError
        insertedProducts = data || []
      }

      if (existingItems.length > 0) {
        const updateResults = await Promise.all(
          existingItems.map(async (item) => {
            const { data: scopedProduct, error: scopeError } = await supabase
              .from("products")
              .select("id")
              .eq("id", item.productId)
              .eq("business_id", businessId)
              .eq("branch_id", branchId)
              .maybeSingle()

            if (scopeError) throw scopeError
            if (!scopedProduct) {
              throw new Error(`Product "${item.productName}" does not belong to the selected branch`)
            }

            return supabase
              .from("products")
              .update({
                current_quantity: item.quantity,
                buying_price: item.landedCostPerUnit,
                selling_price: item.sellingPrice,
              })
              .eq("id", item.productId)
              .eq("business_id", businessId)
              .eq("branch_id", branchId)
          })
        )

        const failedUpdate = updateResults.find((result) => result.error)
        if (failedUpdate?.error) throw failedUpdate.error
      }

      const insertedByIndex = new Map(
        newItems.map((item, idx) => [
          item.index,
          {
            productId: insertedProducts[idx]?.id || null,
            productName: insertedProducts[idx]?.name || item.productName,
            sku: insertedProducts[idx]?.sku_id || newProductPayload[idx]?.sku || null,
          },
        ])
      )

      const persistedItems = stagedItems
        .map((item) => {
          if (item.mode === "existing") return item

          const inserted = insertedByIndex.get(item.index)
          return {
            ...item,
            productId: inserted?.productId,
            productName: inserted?.productName || item.productName,
            sku: inserted?.sku || item.sku,
          }
        })
        .sort((a, b) => a.index - b.index)

      const snapshot = {
        branchId,
        branchName: activeBranch?.name || null,
        stockTakeDate: openingDate,
        products: persistedItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
        createdBy: userId,
        createdAt: new Date().toISOString(),
      }

      const { data: baseline } = await supabase
        .from("float_baseline")
        .select("opening_stock")
        .eq("business_id", businessId)
        .maybeSingle()

      const existingSnapshots = Array.isArray(baseline?.opening_stock) ? baseline.opening_stock : []
      const updatedSnapshots = [
        ...existingSnapshots.filter((s) => s.branchId !== snapshot.branchId),
        snapshot,
      ]

      const { error: upsertError } = await supabase
        .from("float_baseline")
        .upsert({
          business_id: businessId,
          opening_stock: updatedSnapshots,
          opening_stock_date: openingDate,
          updated_at: new Date().toISOString(),
        }, { onConflict: "business_id" })

      if (upsertError) throw upsertError

      setSuccess(true)
      setAddedStock(persistedItems)
    } catch (err) {
      setError(err.message || "Failed to save baseline")
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate("/settings", { replace: true })
  }

  const totalInventoryValue = addedStock.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
            <span className="text-emerald-400 text-4xl">âœ“</span>
          </div>
          <div>
            <h2 className="text-white font-bold text-2xl tracking-tight">Baseline saved</h2>
            <p className="text-zinc-500 text-sm mt-2">Baseline captured for {addedStock.length} products</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => navigate("/settings/historical-sales")} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl py-3 text-sm transition-colors">
              Continue to backdated sales
            </button>
            <button onClick={() => navigate("/settings")} className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-medium rounded-xl py-3 text-sm transition-colors">
              Back to settings
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppShell
      title="Reorientation stock"
      subtitle={`Step ${step} of 4 · Product → Opening qty → Pricing → Review`}
      contentClassName="max-w-6xl"
      right={
        <div className="flex items-center gap-2">
          <UiButton variant="tertiary" size="sm" onClick={goBack}>← Back</UiButton>
          {canViewAll ? <BranchSelector /> : null}
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4">
          {error && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            {[
              { n: 1, label: "Identity" },
              { n: 2, label: "Opening" },
              { n: 3, label: "Pricing" },
              { n: 4, label: "Review" },
            ].map((s) => (
              <button
                key={s.n}
                onClick={() => {
                  if (s.n === 1) setStep(1)
                  if (s.n === 2 && canProceedStep1) setStep(2)
                  if (s.n === 3 && canProceedStep1 && canProceedStep2) setStep(3)
                  if (s.n === 4 && addedStock.length > 0) setStep(4)
                }}
                className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                  step === s.n
                    ? "bg-emerald-500 text-black"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-500"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <UiCard className="p-4 space-y-3">
            <UiSectionTitle title="Opening date" caption="This anchors the baseline inventory snapshot" />
            <input
              type="date"
              value={openingDate}
              onChange={(e) => setOpeningDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-500"
            />
                      </UiCard>

          {step === 1 && (
            <Section label="01 — Product Identity">
              <UiSectionTitle title="Choose what you are opening with" caption="Create a new product or set a starting level for an existing one" />
              <div className="flex gap-2 mb-5">
                <ToggleBtn active={isNewProduct} onClick={() => setIsNewProduct(true)}>New product</ToggleBtn>
                <ToggleBtn active={!isNewProduct} onClick={() => setIsNewProduct(false)}>Existing product</ToggleBtn>
              </div>

              {canViewAll && !resolvedBranchId && (
                <p className="text-amber-400 text-xs mb-3">Select a branch from the header before continuing.</p>
              )}

              {isNewProduct ? (
                <div className="space-y-4">
                  <Field label="Product name">
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Premium Rice 50kg" />
                    {name && <p className="text-zinc-600 text-xs mt-1.5 font-mono tracking-wide">SKU auto-generated on save</p>}
                  </Field>
                  <CategorySelect
                    label="Category"
                    value={category}
                    onChange={setCategory}
                    options={categoryOptions}
                    placeholder="Type or choose a category"
                  />
                  <p className="text-[11px] text-zinc-600">Unit is managed centrally and defaults to pcs for now.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search products..." />
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {existingProducts
                      .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku_id?.toLowerCase().includes(productSearch.toLowerCase()))
                      .map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedProduct(p)}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors ${
                            selectedProduct?.id === p.id
                              ? "bg-emerald-500/10 border border-emerald-500/30"
                              : "bg-zinc-900 hover:bg-zinc-800 border border-zinc-800"
                          }`}
                        >
                          <div>
                            <p className="text-white text-sm font-medium">{p.name}</p>
                            <p className="text-zinc-600 text-xs font-mono mt-0.5">{p.sku_id}</p>
                          </div>
                          {selectedProduct?.id === p.id && <span className="text-emerald-400 text-sm">âœ“</span>}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {step === 2 && (
            <Section label="02 — Opening Quantity & Cost">
              <UiSectionTitle title="Capture the starting inventory" caption="Use physical count and landed cost at opening" />
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Quantity on hand">
                    <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0.00" />
                  </Field>
                  <Field label="Unit cost (KES)">
                    <Input type="number" value={unitCost} onChange={e => setUnitCost(e.target.value)} placeholder="0.00" />
                  </Field>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-medium">Additional costs</p>
                    <button onClick={addCostLine} className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors font-medium">+ Add line</button>
                  </div>
                  {additionalCosts.length > 0 && (
                    <div className="space-y-2">
                      {additionalCosts.map((costLine, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={costLine.label}
                            onChange={e => updateCostLine(i, "label", e.target.value)}
                            placeholder="Label (e.g. Transport)"
                            className="flex-1 bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-xs outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
                          />
                          <input
                            type="number"
                            value={costLine.amount}
                            onChange={e => updateCostLine(i, "amount", e.target.value)}
                            placeholder="0.00"
                            className="w-28 bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-xs outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
                          />
                          <button onClick={() => removeCostLine(i)} className="text-zinc-700 hover:text-red-400 transition-colors text-sm px-1">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {landedCostPerUnit > 0 && (
                  <>
                    <StatRow label="Landed cost / unit" value={fmt(landedCostPerUnit)} accent />
                    <StatRow label="Opening stock value" value={fmt(totalLandedCost)} />
                  </>
                )}
              </div>
            </Section>
          )}

          {step === 3 && (
            <Section label="03 — Pricing">
              <UiSectionTitle title="Set the selling strategy" caption="Price from the opening landed cost" />
              <div className="space-y-5">
                <StatRow label="Landed cost / unit" value={fmt(landedCostPerUnit)} accent />
                <Field label="Selling price (KES)">
                  <Input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} placeholder="0.00" />
                  {landedCostPerUnit > 0 && (
                    <p className="text-zinc-600 text-xs mt-1.5">Suggested range · {fmtShort(suggestedLow)} – {fmtShort(suggestedHigh)}</p>
                  )}
                </Field>

                {sp > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-zinc-400">Profit per unit</p>
                      <p className={`text-sm font-mono font-bold ${profitPerUnit > 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(profitPerUnit)}</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                      <p className="text-sm text-white font-medium">Profit for {qty} units</p>
                      <p className={`text-sm font-mono font-bold ${profitTotal > 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(profitTotal)}</p>
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {step === 4 && (
            <Section label="04 — Review & Save">
              <UiSectionTitle title="Opening stock batch" caption="Review the products staged for this baseline" />
              <div className="mb-4">
                <UiButton
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    resetEntryForm()
                    setIsNewProduct(true)
                    setStep(1)
                  }}
                >
                  {addedStock.length > 0 ? "Add another SKU" : "New SKU"}
                </UiButton>
              </div>
              {addedStock.length === 0 ? (
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-5 text-center">
                  <p className="text-zinc-400 text-sm">No products added yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {addedStock.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800">
                      <div>
                        <p className="text-white text-sm font-medium">{item.productName}</p>
                        <p className="text-zinc-600 text-xs mt-0.5">{item.quantity} × {fmt(item.unitCost)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 text-sm font-mono font-bold">{fmt(item.quantity * item.unitCost)}</p>
                        <button onClick={() => setAddedStock(addedStock.filter((_, i) => i !== idx))} className="text-zinc-600 hover:text-red-400 transition-colors text-xs mt-1">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          <UiCard className="p-4">
            <div className="flex items-center justify-between gap-2">
              <UiButton
                variant="secondary"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1 || loading}
              >
                Back
              </UiButton>

              {step < 3 && (
                <UiButton
                  variant="primary"
                  onClick={() => setStep((s) => Math.min(3, s + 1))}
                  disabled={
                    (step === 1 && !canProceedStep1) ||
                    (step === 2 && !canProceedStep2)
                  }
                >
                  Continue
                </UiButton>
              )}

              {step === 3 && (
                <UiButton
                  variant="primary"
                  onClick={() => {
                    handleAddProduct()
                    if (canSubmit) setStep(4)
                  }}
                  disabled={loading || !canProceedStep3}
                >
                  Add to baseline
                </UiButton>
              )}

              {step === 4 && (
                <UiButton variant="primary" onClick={handleSaveBaseline} disabled={loading || addedStock.length === 0}>
                  {loading ? "Saving..." : "Save opening baseline"}
                </UiButton>
              )}
            </div>
          </UiCard>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 self-start">
          <UiCard className="p-5 space-y-3">
            <UiSectionTitle title="Live preview" caption="Realtime opening stock impact" />
            <StatRow label="Product" value={isNewProduct ? (name || "Draft") : (selectedProduct?.name || "Select product")} />
            <StatRow label="Qty" value={qty || 0} />
            <StatRow label="Unit cost" value={fmt(cost)} />
            <StatRow label="Landed / unit" value={fmt(landedCostPerUnit)} accent />
            <StatRow label="Sell price" value={fmt(sp)} />
          </UiCard>

          <UiCard className="p-5 space-y-3">
            <UiSectionTitle title="Baseline summary" />
            <StatRow label="Opening date" value={openingDate || "-"} />
            <StatRow label="Products added" value={addedStock.length} />
            <StatRow label="Inventory value" value={fmt(totalInventoryValue)} accent />
          </UiCard>

          <UiCard className="p-5 space-y-3">
            <UiSectionTitle title="Confidence checklist" />
            {[
              { ok: canProceedStep1, text: "Product is selected or named" },
              { ok: canProceedStep2, text: "Opening quantity and cost provided" },
              { ok: canProceedStep3, text: "Selling price set" },
              { ok: addedStock.length > 0, text: "At least one product staged" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <p className={item.ok ? "text-zinc-300" : "text-zinc-600"}>{item.text}</p>
                <span className={item.ok ? "text-emerald-400" : "text-zinc-700"}>{item.ok ? "✓" : "•"}</span>
              </div>
            ))}
          </UiCard>
        </div>
      </div>
    </AppShell>
  )
}

function Section({ label, children }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-medium mb-5">{label}</p>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-zinc-400 text-xs mb-2 block">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
    />
  )
}

function ToggleBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors ${
        active ? "bg-emerald-500 text-black" : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  )
}

function StatRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
      <p className="text-zinc-400 text-sm">{label}</p>
      <p className={`text-sm font-mono font-bold ${accent ? "text-emerald-400" : "text-white"}`}>{value}</p>
    </div>
  )
}
