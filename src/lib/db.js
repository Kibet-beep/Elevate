import { createRxDatabase, addRxPlugin } from 'rxdb'
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory'
import { SupabaseReplication } from './supabase-replication.js'
import { supabase } from './supabase'

const productSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    sku_id: { type: 'string' },
    category: { type: 'string' },
    current_quantity: { type: 'number' },
    reorder_point: { type: 'number' },
    buying_price: { type: 'number' },
    selling_price: { type: 'number' },
    unit_of_measure: { type: 'string' },
    branch_id: { type: 'string' },
    business_id: { type: 'string' },
    is_active: { type: 'boolean' },
    _modified: { type: 'number' },
    _deleted: { type: 'boolean' },
  },
  required: ['id'],
}

const transactionSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    business_id: { type: 'string' },
    branch_id: { type: 'string' },
    type: { type: 'string' },
    transaction_type_tag: { type: 'string' },
    payment_account: { type: 'string' },
    account_code: { type: 'string' },
    date: { type: 'string' },
    created_by: { type: 'string' },
    _modified: { type: 'number' },
    _deleted: { type: 'boolean' },
  },
  required: ['id'],
}

let dbInstance = null
let dbPromise = null

export async function getDb() {
  if (dbInstance) return dbInstance
  
  // If already initializing, wait for the same promise
  if (dbPromise) return dbPromise

  dbPromise = (async () => {
    const db = await createRxDatabase({
      name: 'elevatedb',
      storage: getRxStorageMemory(),
      ignoreDuplicate: true,
    })

    await db.addCollections({
      products:     { schema: productSchema },
      transactions: { schema: transactionSchema },
    })

    dbInstance = db
    return db
  })()

  return dbPromise
}

export function startProductsReplication(collection, businessId) {
  const replication = new SupabaseReplication({
    replicationIdentifier: `products-${businessId}`,
    collection,
    supabaseClient: supabase,
    pull: {
      queryBuilder: (checkpoint) => {
        let query = supabase
          .from('products')
          .select('*')
          .eq('business_id', businessId)
          .order('_modified', { ascending: true })
          .order('id', { ascending: true })
          .limit(200)

        if (checkpoint) {
          query = query.gt('_modified', checkpoint.modified)
        }

        return query
      }
    },
    push: {
      queryBuilder: (rows) => {
        return supabase
          .from('products')
          .upsert(rows.map(r => r.newDocumentState))
      }
    },
  })

  window.addEventListener('online', () => replication.reSync())
  return replication
}

export function startTransactionsReplication(collection, businessId) {
  const replication = new SupabaseReplication({
    replicationIdentifier: `transactions-${businessId}`,
    collection,
    supabaseClient: supabase,
    pull: {
      queryBuilder: (checkpoint) => {
        let query = supabase
          .from('transactions')
          .select('*')
          .eq('business_id', businessId)
          .order('_modified', { ascending: true })
          .order('id', { ascending: true })
          .limit(200)

        if (checkpoint) {
          query = query.gt('_modified', checkpoint.modified)
        }

        return query
      }
    },
    push: {
      queryBuilder: (rows) => {
        return supabase
          .from('transactions')
          .upsert(rows.map(r => r.newDocumentState))
      }
    },
  })

  window.addEventListener('online', () => replication.reSync())
  return replication
}