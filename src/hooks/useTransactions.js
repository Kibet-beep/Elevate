import { useState, useEffect } from "react"
import { getDb } from "../lib/db"
import { useInstantAuth } from "./useInstantAuth"
import { listTransactions } from "../services/transactionsService"

export function useTransactions(branchId = null) {
  const { business } = useInstantAuth()

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!business?.id) {
      setTransactions([])
      setLoading(false)
      setError(null)
      return
    }

    let active = true
    let subscription
    let replication

    const init = async () => {
      if (!active) return

      setLoading(true)
      setError(null)

      try {
        const db = await getDb()
        if (!active) return

        // Note: Transaction replication is handled by AppInitializer to prevent duplicates
        // try {
        //   replication = startTransactionsReplication(db.transactions, business.id)
        // } catch (replicationError) {
        //   console.error("Failed to start transactions replication:", replicationError)
        // }
        console.log("[USE-TRANSACTIONS] Skipping replication - handled by AppInitializer")

        const selector = {
          business_id: business.id,
          _deleted: { $ne: true },
          ...(branchId ? { branch_id: branchId } : {}),
        }

        const initialTransactions = await listTransactions({
          businessId: business.id,
          branchId,
        })

        if (!active) return

        setTransactions(initialTransactions)
        setLoading(false)

        subscription = db.transactions
          .find({
            selector,
            sort: [{ date: "desc" }, { id: "desc" }],
          })
          .$
          .subscribe({
            next: (docs) => {
              if (!active) return

              const normalized = docs
                .map((doc) => normalizeTransaction(doc.toJSON()))
                .filter(Boolean)

              setTransactions(normalized)
              setLoading(false)
            },

            error: (subscriptionError) => {
              if (!active) return
              setError(subscriptionError)
              setLoading(false)
            },
          })
      } catch (err) {
        if (!active) return
        setError(err)
        setLoading(false)
      }
    }

    init()

    return () => {
      active = false
      subscription?.unsubscribe()
      replication?.cancel?.()
    }
  }, [business?.id, branchId])

  return { transactions, loading, error }
}

function normalizeTransaction(transaction) {
  if (!transaction || !["sale", "expense"].includes(transaction.type)) {
    return null
  }

  if (transaction.type === "sale") {
    const saleItems = Array.isArray(transaction.sale_items)
      ? transaction.sale_items
      : []

    const amount =
      transaction.amount ??
      saleItems.reduce(
        (sum, item) => sum + Number(item?.total_amount || 0),
        0
      )

    const displayName =
      transaction.display_name ||
      (saleItems.length > 1
        ? `${saleItems[0]?.products?.name || "Sale"} +${saleItems.length - 1} more` 
        : saleItems[0]?.products?.name || "Sale")

    return {
      ...transaction,
      amount: Number(amount || 0),
      display_name: displayName,
      lifecycle_state: transaction.lifecycle_state || "completed",
    }
  }

  if (transaction.type === "expense") {
    const expenses = Array.isArray(transaction.expenses)
      ? transaction.expenses
      : []

    const amount =
      transaction.amount ??
      expenses.reduce(
        (sum, item) => sum + Number(item?.amount || 0),
        0
      )

    const displayName =
      transaction.display_name ||
      expenses[0]?.category ||
      "Expense"

    return {
      ...transaction,
      amount: Number(amount || 0),
      display_name: displayName,
      lifecycle_state: transaction.lifecycle_state || "completed",
    }
  }

  return null
}