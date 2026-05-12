import { useEffect } from "react"
import { getDb } from "../lib/db"
import { initBranchAssignmentsReplication } from "../lib/replication/initBranchAssignmentsReplication"
import { useInstantAuth } from "../hooks/useInstantAuth"

let branchAssignmentsInitialized = false
let transactionReplicationMap = new Map()

export function AppInitializer() {
  const { business } = useInstantAuth()

  useEffect(() => {
    const init = async () => {
      try {
        const db = await getDb()
        
        // Initialize branch assignments replication once
        if (!branchAssignmentsInitialized) {
          await initBranchAssignmentsReplication(db)
          branchAssignmentsInitialized = true
          console.log("[Replication] Branch assignments replication initialized")
        }

        // Initialize transaction replication per business
        if (business?.id && !transactionReplicationMap.has(business.id)) {
          try {
            const { startTransactionsReplication } = await import("../lib/db")
            startTransactionsReplication(db.transactions, business.id)
            transactionReplicationMap.set(business.id, true)
            console.log("[Replication] Transactions replication initialized for business:", business.id)
          } catch (replicationError) {
            console.error("[Replication] Failed to start transactions replication:", replicationError)
            // Don't throw error, just log it to prevent app crash
          }
        }
      } catch (err) {
        console.error("Failed to initialize replication:", err)
      }
    }

    init()
  }, [business?.id])

  return null
}
