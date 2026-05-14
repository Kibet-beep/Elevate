import { useInstantAuth } from "../../hooks/useInstantAuth"
import { useEffect } from "react"
import { getDb } from "../db"

let replicationMap = new Map()

export async function ensureTransactionsReplication(businessId) {
  if (!businessId) return
  
  // Check if already initialized for this business
  if (replicationMap.has(businessId)) {
    return
  }

  try {
    const db = await getDb()
    
    // Import here to avoid circular dependency
    const { startTransactionsReplication } = await import("../db.js")
    
    // Start replication (singleton pattern handles duplicates)
    const replication = startTransactionsReplication(db.transactions, businessId)
    replicationMap.set(businessId, replication)
    
    console.log("[Replication] Transactions replication started for business:", businessId)
  } catch (err) {
    console.error("[Replication] Failed to initialize transactions replication:", err)
  }
}

export function useTransactionsReplicationInit() {
  const { business } = useInstantAuth()

  useEffect(() => {
    if (business?.id) {
      ensureTransactionsReplication(business.id)
    }
  }, [business?.id])
}
