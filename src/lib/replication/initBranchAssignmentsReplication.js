import { supabase } from "../supabase"
import { replicateRxCollection } from "rxdb/plugins/replication"

let started = false

export async function initBranchAssignmentsReplication(db) {
  if (started) return
  started = true

  const collection = db.branch_assignments

  await replicateRxCollection({
    collection,
    replicationIdentifier: "branch-assignments-sync",

    pull: {
      async handler(lastCheckpoint) {
        // Use created_at as fallback until updated_at column is added via migration
        const checkpointField = "created_at"
        const lastSync = lastCheckpoint?.[checkpointField] || new Date(0).toISOString()

        const { data, error } = await supabase
          .from("user_branch_assignments")
          .select("*")
          .gt(checkpointField, lastSync)

        if (error) throw error

        return {
          documents: data || [],
          checkpoint: {
            [checkpointField]: new Date().toISOString(),
          },
        }
      },
    },

    push: {
      async handler(docs) {
        for (const doc of docs) {
          await supabase.from("user_branch_assignments").upsert(doc)
        }
        return docs
      },
    },

    live: true,
    retryTime: 5000,
  })
}
