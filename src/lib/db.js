import { createRxDatabase } from 'rxdb'
import { addRxPlugin } from 'rxdb'
import { RxDBMigrationPlugin } from 'rxdb/plugins/migration'
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie'
import { SupabaseReplication } from './supabase-replication.js'
import { attachAutoResync, stripSyncMetadata } from './sync.js'
import { supabase } from './supabase'

addRxPlugin(RxDBMigrationPlugin)

const noopMigrationStrategies = {
  1: (doc) => doc,
  2: (doc) => doc,
}

const productSchema = {
  version: 2,
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
    vat_type: { type: 'string' },
    unit_of_measure: { type: 'string' },
    branch_id: { type: 'string' },
    business_id: { type: 'string' },
    is_active: { type: 'boolean' },
    syncStatus: { type: ['string', 'null'] },
    syncError: { type: ['string', 'null'] },
    syncedAt: { type: ['number', 'null'] },
    _modified: { type: 'number' },
    _deleted: { type: 'boolean' },
  },
  required: ['id'],
}

const stockEntrySchema = {
  version: 2,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    business_id: { type: 'string' },
    branch_id: { type: ['string', 'null'] },
    product_id: { type: 'string' },
    supplier_id: { type: ['string', 'null'] },
    quantity: { type: 'number' },
    buying_price: { type: 'number' },
    freight_cost: { type: 'number' },
    import_duty: { type: 'number' },
    idf: { type: 'number' },
    rdl: { type: 'number' },
    vat_on_import: { type: 'number' },
    insurance: { type: 'number' },
    additional_costs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          amount: { type: ['string', 'number'] },
        },
      },
    },
    total_cost: { type: 'number' },
    created_by: { type: 'string' },
    syncStatus: { type: ['string', 'null'] },
    syncError: { type: ['string', 'null'] },
    syncedAt: { type: ['number', 'null'] },
    _modified: { type: 'number' },
    _deleted: { type: 'boolean' },
  },
  required: ['id'],
}

const transactionSchema = {
  version: 2,
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
    lifecycle_state: { type: 'string' },
    amount: { type: 'number' },
    display_name: { type: 'string' },
    sale_items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          product_name: { type: 'string' },
          quantity: { type: 'number' },
          unit_price: { type: 'number' },
          total_amount: { type: 'number' },
          vat_applied: { type: 'number' },
          etims_receipt_no: { type: ['string', 'null'] },
        },
      },
    },
    expense: {
      type: 'object',
      properties: {
        transaction_id: { type: 'string' },
        category: { type: 'string' },
        amount: { type: 'number' },
        description: { type: ['string', 'null'] },
      },
    },
    transfer: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        business_id: { type: 'string' },
        branch_id: { type: 'string' },
        from_account: { type: 'string' },
        to_account: { type: 'string' },
        amount: { type: 'number' },
        transaction_cost: { type: 'number' },
        date: { type: 'string' },
        note: { type: ['string', 'null'] },
        created_by: { type: 'string' },
      },
    },
    costExpense: {
      type: 'object',
      properties: {
        transaction: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            business_id: { type: 'string' },
            branch_id: { type: 'string' },
            type: { type: 'string' },
            transaction_type_tag: { type: 'string' },
            payment_account: { type: 'string' },
            account_code: { type: 'string' },
            date: { type: 'string' },
            created_by: { type: 'string' },
          },
        },
        expense: {
          type: 'object',
          properties: {
            transaction_id: { type: 'string' },
            category: { type: 'string' },
            amount: { type: 'number' },
            description: { type: ['string', 'null'] },
          },
        },
      },
    },
    stock_take: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        business_id: { type: 'string' },
        branch_id: { type: 'string' },
        type: { type: 'string' },
        start_date: { type: 'string' },
        status: { type: 'string' },
        counted_by: { type: 'string' },
      },
    },
    stock_take_id: { type: 'string' },
    stock_take_items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          stock_take_id: { type: 'string' },
          product_id: { type: 'string' },
          expected_quantity: { type: 'number' },
          actual_quantity: { type: 'number' },
        },
      },
    },
    stock_take_approval: {
      type: 'object',
      properties: {
        stockTakeId: { type: 'string' },
        approvedBy: { type: 'string' },
        endDate: { type: 'string' },
      },
    },
    syncStatus: { type: ['string', 'null'] },
    syncError: { type: ['string', 'null'] },
    syncedAt: { type: ['number', 'null'] },
    _modified: { type: 'number' },
    _deleted: { type: 'boolean' },
  },
  required: ['id'],
}

const branchSchema = {
  version: 2,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    business_id: { type: 'string' },
    name: { type: 'string' },
    code: { type: ['string', 'null'] },
    address: { type: ['string', 'null'] },
    phone: { type: ['string', 'null'] },
    email: { type: ['string', 'null'] },
    is_active: { type: 'boolean' },
    status: { type: 'string' },
    syncStatus: { type: ['string', 'null'] },
    syncError: { type: ['string', 'null'] },
    syncedAt: { type: ['number', 'null'] },
    _modified: { type: 'number' },
    _deleted: { type: 'boolean' },
  },
  required: ['id'],
}

const branchAssignmentSchema = {
  version: 2,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 200 },
    user_id: { type: 'string' },
    branch_id: { type: 'string' },
    role: { type: 'string' },
    is_active: { type: 'boolean' },
    syncStatus: { type: ['string', 'null'] },
    syncError: { type: ['string', 'null'] },
    syncedAt: { type: ['number', 'null'] },
    _modified: { type: 'number' },
    _deleted: { type: 'boolean' },
  },
  required: ['id', 'user_id', 'branch_id'],
}

let dbInstance = null
let dbPromise = null

export async function getDb() {
  if (dbInstance) {
    // Ensure any newly added collections are present on existing db instances
    const missing = {}
    if (!dbInstance.products) missing.products = { schema: productSchema }
    if (!dbInstance.transactions) missing.transactions = { schema: transactionSchema }
    if (!dbInstance.stock_entries) missing.stock_entries = { schema: stockEntrySchema }
    if (!dbInstance.branches) missing.branches = { schema: branchSchema }
    if (!dbInstance.branch_assignments) missing.branch_assignments = { schema: branchAssignmentSchema }

    if (Object.keys(missing).length > 0) {
      try {
        // addCollections is safe to call for missing collections
        // (it will throw if a collection already exists)
        // We ignore errors to avoid breaking existing usage.
        const collections = Object.fromEntries(
          Object.entries(missing).map(([name, value]) => [
            name,
            {
              ...value,
              migrationStrategies: noopMigrationStrategies,
            },
          ])
        )
        await dbInstance.addCollections(collections)
      } catch (err) {
        console.warn('Failed to add missing collections to existing DB instance', err)
      }
    }

    return dbInstance
  }
  // If already initializing, wait for the same promise
  if (dbPromise) return dbPromise

  dbPromise = (async () => {
    const db = await createRxDatabase({
      name: 'elevatedb',
      storage: getRxStorageDexie(),
      ignoreDuplicate: true,
    })

    await db.addCollections({
      products:      { schema: productSchema, migrationStrategies: noopMigrationStrategies },
      transactions:  { schema: transactionSchema, migrationStrategies: noopMigrationStrategies },
      stock_entries: { schema: stockEntrySchema, migrationStrategies: noopMigrationStrategies },
      branches:      { schema: branchSchema, migrationStrategies: noopMigrationStrategies },
      branch_assignments: { schema: branchAssignmentSchema, migrationStrategies: noopMigrationStrategies },
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
          .upsert(rows.map(r => stripSyncMetadata(r.newDocumentState)))
      }
    },
    live: true,
  })

  attachAutoResync(replication)
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

        if (checkpoint?.modified) {
          query = query.gt('_modified', checkpoint.modified)
        }

        return query
      }
    },
    push: {
      queryBuilder: (rows) => {
        return supabase
          .from('transactions')
          .upsert(rows.map(r => stripSyncMetadata(r.newDocumentState)))
      }
    },
  })

  attachAutoResync(replication)
  return replication
}

export function startStockEntriesReplication(collection, businessId) {
  const replication = new SupabaseReplication({
    replicationIdentifier: `stock_entries-${businessId}`,
    collection,
    table: 'stock_entries',
    supabaseClient: supabase,
    push: {
      queryBuilder: (rows) => {
        return supabase
          .from('stock_entries')
          .upsert(rows.map(r => stripSyncMetadata(r.newDocumentState)))
      }
    },
    live: true,
  })

  attachAutoResync(replication)
  return replication
}

const replicationRegistry = new Map()

function getReplicationRegistryKey(prefix, businessId) {
  return `${prefix}-${businessId}`
}

function startSingletonReplication(prefix, businessId, createReplication) {
  const key = getReplicationRegistryKey(prefix, businessId)
  const existing = replicationRegistry.get(key)

  if (existing) {
    return existing
  }

  const replication = createReplication()
  replicationRegistry.set(key, replication)

  return replication
}

export function startBranchesReplication(collection, businessId) {
  return startSingletonReplication('branches', businessId, () => {
    const replication = new SupabaseReplication({
      replicationIdentifier: `branches-${businessId}`,
      collection,
      supabaseClient: supabase,
      pull: {
        queryBuilder: (checkpoint) => {
          let query = supabase
            .from('branches')
            .select('*')
            .eq('business_id', businessId)
            .order('_modified', { ascending: true })
            .order('id', { ascending: true })
            .limit(200)

          if (checkpoint?.modified) {
            query = query.gt('_modified', checkpoint.modified)
          }

          return query
        }
      },
      push: {
        queryBuilder: (rows) => {
          return supabase
            .from('branches')
            .upsert(rows.map(r => stripSyncMetadata(r.newDocumentState)))
        }
      },
      live: true,
    })

    attachAutoResync(replication)
    return replication
  })
}

export function startBranchAssignmentsReplication(collection, businessId) {
  return startSingletonReplication('branch-assignments', businessId, () => {
    const replication = new SupabaseReplication({
      replicationIdentifier: `branch-assignments-${businessId}`,
      collection,
      supabaseClient: supabase,
      pull: {
        queryBuilder: async (checkpoint) => {
          let query = supabase
            .from('user_branch_assignments')
            .select('*, branches!inner(business_id)')
            .eq('branches.business_id', businessId)
            .order('_modified', { ascending: true })
            .order('user_id', { ascending: true })
            .order('branch_id', { ascending: true })
            .limit(300)

          if (checkpoint?.modified) {
            query = query.gt('_modified', checkpoint.modified)
          }

          const { data } = await query
          return data.map(row => ({
            id: `${row.user_id}:${row.branch_id}`,
            user_id: row.user_id,
            branch_id: row.branch_id,
            role: row.role,
            is_active: row.is_active,
            syncStatus: 'synced',
            syncError: null,
            syncedAt: row._modified,
            _modified: row._modified,
            _deleted: false,
          }))
        },
        mapDocument: (row) => row,
      },
      push: {
        customInsertHandler: async (doc) => {
          const { error } = await supabase
            .from('user_branch_assignments')
            .upsert(stripSyncMetadata({
              user_id: doc.user_id,
              branch_id: doc.branch_id,
              role: doc.role,
              is_active: doc.is_active,
            }))

          if (error) throw error
          return []
        },
        customUpdateHandler: async (row) => {
          const nextDoc = row.newDocumentState
          const { error } = await supabase
            .from('user_branch_assignments')
            .upsert(stripSyncMetadata({
              user_id: nextDoc.user_id,
              branch_id: nextDoc.branch_id,
              role: nextDoc.role,
              is_active: nextDoc.is_active,
            }))

          if (error) throw error
          return true
        },
      },
      live: true,
    })

    attachAutoResync(replication)
    return replication
  })
}