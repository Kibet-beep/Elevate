// src/pages/transactions/AddSale.jsx
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useUser, useCurrentBusiness } from "../../hooks/useRole"
import { useBranchContext } from "../../context/BranchContext"
import { AppShell, UiButton, UiCard, UiSectionTitle } from "../../components/ui"
import { BranchSelector } from "../../components/BranchSelector"
import { getDb } from "../../lib/db"
import { useProducts } from "../../hooks/useProducts"
import {
  getTodayStartEAT,
  toTransactionDateEAT,
} from "../../features/dashboard/utils/dashboard.time"

export default function AddSale() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const { user: authUser } = useUser()
  const { businessId } = useCurrentBusiness()

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

    const db = await getDb()

    const transactionId = crypto.randomUUID()

    const transaction = {
      id: transactionId,
      business_id: businessId,
      branch_id: resolvedBranchId,
      type: "sale",
      transaction_type_tag: "income",
      payment_account: paymentAccount,
      account_code: "4100",
      date: toTransactionDateEAT(saleDate),
      created_by: userId,
      lifecycle_state: "finalized",
      amount: total,
      display_name:
        cartItems.length > 1
          ? `${cartItems[0].name} + ${cartItems.length - 1} more` 
          : cartItems[0].name || "Sale",
      sale_items: cartItems.map((item) => ({
        product_id: item.product_id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_amount: item.unit_price * item.quantity,
        vat_applied: item.vat_type !== "exempt" ? 1 : 0,
        etims_receipt_no: etimsNo || null,
      })),
    }

    await db.transactions.insert(transaction)

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

  return (
    <AppShell
      title="New Sale"
      subtitle={`${
        viewMode === "branch" && activeBranch
          ? `${activeBranch.name} • ` 
          : ""
      }Record a sale transaction`}
      contentClassName="max-w-6xl"
      right={
        <div className="flex w-full flex-wrap items-stretch gap-1.5 sm:w-auto sm:items-center sm:gap-3">
          <UiButton
            variant="secondary"
            size="sm"
            onClick={() => navigate("/transactions")}
            className="flex-1 px-2 text-xs sm:flex-none sm:px-3"
          >
            Back
          </UiButton>

          {canViewAll ? <BranchSelector /> : null}
        </div>
      }
    >
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

          {/* Keep the rest of your existing UI unchanged */}
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

      <div className="hidden md:flex md:justify-end md:gap-2 md:sticky md:bottom-6 md:right-6 md:pr-6">
        <UiButton
          variant="primary"
          className="px-6 py-3"
          onClick={handleSubmit}
          disabled={loading || cartItems.length === 0}
        >
          {loading ? "Recording..." : `Record sale • ${fmt(total)}`}
        </UiButton>
      </div>
    </AppShell>
  )
}
