import { createRxDatabase } from 'rxdb'
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie'
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
    vat_type: { type: 'string' },
    unit_of_measure: { type: 'string' },
    branch_id: { type: 'string' },
    business_id: { type: 'string' },
    is_active: { type: 'boolean' },
    _modified: { type: 'number' },
    _deleted: { type: 'boolean' },
  },
  required: ['id'],
}

const stockEntrySchema = {
  version: 0,
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
    _modified: { type: 'number' },
    _deleted: { type: 'boolean' },
  },
  required: ['id'],
}

const branchSchema = {
  version: 0,
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
    _modified: { type: 'number' },
    _deleted: { type: 'boolean' },
  },
  required: ['id'],
}

const branchAssignmentSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 200 },
    user_id: { type: 'string' },
    branch_id: { type: 'string' },
    role: { type: 'string' },
    is_active: { type: 'boolean' },
    _modified: { type: 'number' },
    _deleted: { type: 'boolean' },
  },
  required: ['id', 'user_id', 'branch_id'],
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
      storage: getRxStorageDexie(),
      ignoreDuplicate: true,
    })

    await db.addCollections({
      products:      { schema: productSchema },
      transactions:  { schema: transactionSchema },
      stock_entries: { schema: stockEntrySchema },
      branches:      { schema: branchSchema },
      branch_assignments: { schema: branchAssignmentSchema },
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
    live: true,
  })

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => replication.reSync())
  }
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
          .upsert(rows.map(r => r.newDocumentState))
      }
    },
  })

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => replication.reSync())
  }
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
          .upsert(rows.map(r => r.newDocumentState))
      }
    },
    live: true,
  })

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => replication.reSync())
  }
  return replication
}

export function startBranchesReplication(collection, businessId) {
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
          .upsert(rows.map(r => r.newDocumentState))
      }
    },
    live: true,
  })

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => replication.reSync())
  }
  return replication
}

export function startBranchAssignmentsReplication(collection, businessId) {
  const replication = new SupabaseReplication({
    replicationIdentifier: `branch-assignments-${businessId}`,
    collection,
    supabaseClient: supabase,
    pull: {
      queryBuilder: (checkpoint) => {
        let query = supabase
          .from('user_branch_assignments')
          .select('*')
          .order('_modified', { ascending: true })
          .order('user_id', { ascending: true })
          .order('branch_id', { ascending: true })
          .limit(300)

        if (checkpoint?.modified) {
          query = query.gt('_modified', checkpoint.modified)
        }

        return query
      },
      mapDocument: (row) => ({
        id: `${row.user_id}:${row.branch_id}`,
        user_id: row.user_id,
        branch_id: row.branch_id,
        role: row.role,
        is_active: row.is_active,
        _modified: row._modified ?? Date.now(),
        _deleted: false,
      }),
    },
    push: {
      customInsertHandler: async (doc) => {
        const { error } = await supabase
          .from('user_branch_assignments')
          .upsert({
            user_id: doc.user_id,
            branch_id: doc.branch_id,
            role: doc.role,
            is_active: doc.is_active,
          })

        if (error) throw error
        return []
      },
      customUpdateHandler: async (row) => {
        const nextDoc = row.newDocumentState
        const { error } = await supabase
          .from('user_branch_assignments')
          .upsert({
            user_id: nextDoc.user_id,
            branch_id: nextDoc.branch_id,
            role: nextDoc.role,
            is_active: nextDoc.is_active,
          })

        if (error) throw error
        return true
      },
    },
    live: true,
  })

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => replication.reSync())
  }
  return replication
}