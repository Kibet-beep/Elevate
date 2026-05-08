import { RxReplicationState } from "rxdb/plugins/replication";
import { Subject } from "rxjs";
const DEFAULT_LAST_MODIFIED_FIELD = "_modified";
const DEFAULT_DELETED_FIELD = "_deleted";
const POSTGRES_DUPLICATE_KEY_ERROR_CODE = "23505";

function stripTransactionFields(doc) {
  return {
    id: doc.id,
    business_id: doc.business_id,
    branch_id: doc.branch_id,
    type: doc.type,
    transaction_type_tag: doc.transaction_type_tag,
    payment_account: doc.payment_account,
    account_code: doc.account_code,
    date: doc.date,
    created_by: doc.created_by,
    lifecycle_state: doc.lifecycle_state || 'finalized',
  };
}

function stripExpenseFields(expense, transactionId) {
  return {
    transaction_id: transactionId,
    category: expense.category,
    amount: expense.amount,
    description: expense.description ?? null,
  };
}

function stripTransferFields(transfer) {
  return {
    id: transfer.id,
    business_id: transfer.business_id,
    branch_id: transfer.branch_id,
    from_account: transfer.from_account,
    to_account: transfer.to_account,
    amount: transfer.amount,
    transaction_cost: transfer.transaction_cost,
    date: transfer.date,
    note: transfer.note ?? null,
    created_by: transfer.created_by,
  };
}

class SupabaseReplication extends RxReplicationState {
  constructor(options) {
    const realtimeChanges = new Subject();
    super(
      options.replicationIdentifier,
      options.collection,
      options.deletedField || DEFAULT_DELETED_FIELD,
      options.pull && {
        ...options.pull,
        stream$: realtimeChanges,
        handler: (lastCheckpoint, batchSize) => this.pullHandler(lastCheckpoint, batchSize)
      },
      options.push && {
        ...options.push,
        batchSize: 1,
        handler: (rows) => this.pushHandler(rows)
      },
      typeof options.live === "undefined" ? true : options.live,
      typeof options.retryTime === "undefined" ? 5e3 : options.retryTime,
      false // Don't auto-start, we'll handle it manually
    );
    this.options = options;
    this.realtimeChanges = realtimeChanges;
    this.table = options.table || options.collection.name;
    this.primaryKey = options.primaryKey || options.collection.schema.primaryPath;
    this.lastModifiedFieldName = options.pull?.lastModifiedField || DEFAULT_LAST_MODIFIED_FIELD;
    
    // Set up realtime channel before starting
    if (options.pull && (options.pull.realtimePostgresChanges || typeof options.pull.realtimePostgresChanges === "undefined")) {
      this.setupRealtimeChannel();
    }
    
    // Start manually after setup
    if (typeof options.autoStart === "undefined" ? true : options.autoStart) {
      this.start();
    }
  }
  table;
  primaryKey;
  lastModifiedFieldName;
  realtimeChanges;
  realtimeChannel;
  setupRealtimeChannel() {
    this.realtimeChannel = this.options.supabaseClient.channel(`rxdb-supabase-${this.replicationIdentifierHash}`);
    this.realtimeChannel.on("postgres_changes", { event: "*", schema: "public", table: this.table }, (payload) => {
      if (payload.eventType === "DELETE" || !payload.new)
        return;
      this.realtimeChanges.next({
        checkpoint: this.rowToCheckpoint(payload.new),
        documents: [this.rowToRxDoc(payload.new)]
      });
    });
    this.realtimeChannel.subscribe();
  }

  async start() {
    return super.start();
  }
  async cancel() {
    if (this.realtimeChannel) {
      return Promise.all([super.cancel(), this.realtimeChannel.unsubscribe()]);
    }
    return super.cancel();
  }
  /**
   * Pulls all changes since the last checkpoint from supabase.
   */
  async pullHandler(lastCheckpoint, batchSize) {
    let query = this.options.pull?.queryBuilder
      ? this.options.pull.queryBuilder(lastCheckpoint, batchSize)
      : this.options.supabaseClient.from(this.table).select();

    if (!this.options.pull?.queryBuilder && lastCheckpoint && lastCheckpoint.modified) {
      const lastModified = JSON.stringify(lastCheckpoint.modified);
      const lastPrimaryKey = JSON.stringify(lastCheckpoint.primaryKeyValue);
      const isNewer = `${this.lastModifiedFieldName}.gt.${lastModified}`;
      const isSameAge = `${this.lastModifiedFieldName}.eq.${lastModified}`;
      query = query.or(`${isNewer},and(${isSameAge},${this.primaryKey}.gt.${lastPrimaryKey})`);
    }

    if (!this.options.pull?.queryBuilder) {
      query = query.order(this.lastModifiedFieldName).order(this.primaryKey).limit(batchSize);
    }

    const { data, error } = await query;
    if (error)
      throw error;
    if (data.length == 0) {
      return {
        checkpoint: lastCheckpoint,
        documents: []
      };
    }

    // Special handling for transactions: enrich with related sale_items and expenses
    let enrichedData = data;
    if (this.table === 'transactions') {
      const txnIds = data.map(t => t.id);
      const [saleItemsResult, expensesResult] = await Promise.all([
        this.options.supabaseClient.from('sale_items').select('*').in('transaction_id', txnIds),
        this.options.supabaseClient.from('expenses').select('*').in('transaction_id', txnIds)
      ]);

      const saleItemsMap = {};
      const expensesMap = {};

      if (saleItemsResult.data) {
        saleItemsResult.data.forEach(item => {
          if (!saleItemsMap[item.transaction_id]) saleItemsMap[item.transaction_id] = [];
          saleItemsMap[item.transaction_id].push(item);
        });
      }

      if (expensesResult.data) {
        expensesResult.data.forEach(exp => {
          if (!expensesMap[exp.transaction_id]) expensesMap[exp.transaction_id] = [];
          expensesMap[exp.transaction_id].push(exp);
        });
      }

      // Reconstruct transactions with related data
      enrichedData = data.map(txn => ({
        ...txn,
        sale_items: saleItemsMap[txn.id] || [],
        expenses: expensesMap[txn.id] || []
      }));
    }

    const mappedData = this.options.pull?.mapDocument
      ? enrichedData.map((row) => this.options.pull.mapDocument(row))
      : enrichedData

    return {
      checkpoint: this.rowToCheckpoint(mappedData[mappedData.length - 1]),
      documents: mappedData.map(this.rowToRxDoc.bind(this))
    };
  }
  /**
   * Pushes local changes to supabase.
   */
  async pushHandler(rows) {
    if (rows.length != 1)
      throw new Error("Invalid batch size");
    const row = rows[0];
    const nextDoc = row.newDocumentState
    if (this.table === 'branch_assignments' && nextDoc._deleted) {
      const { error } = await this.options.supabaseClient
        .from('user_branch_assignments')
        .delete()
        .eq('user_id', nextDoc.user_id)
        .eq('branch_id', nextDoc.branch_id)

      if (error) throw error
      return true
    }

    if (this.options.push?.queryBuilder) {
      const result = await this.options.push.queryBuilder(rows)
      if (result?.error) {
        throw result.error
      }
      return []
    }

    return row.assumedMasterState ? this.handleUpdate(row) : this.handleInsertion(row.newDocumentState);
  }
  /**
   * Tries to insert a new row. Returns the current state of the row in case of a conflict.
   */
  async handleInsertion(doc) {
    if (this.options.push?.customInsertHandler) {
      return this.options.push.customInsertHandler(doc)
    }

    if (this.table === 'transactions') {
      if (doc.type === 'stock_take_create' && doc.stock_take) {
        const { error: stockTakeError } = await this.options.supabaseClient.from('stock_takes').insert(doc.stock_take)
        if (stockTakeError && stockTakeError.code !== POSTGRES_DUPLICATE_KEY_ERROR_CODE) {
          throw stockTakeError
        }
        return []
      }

      if (doc.type === 'stock_take_submit_counts' && doc.stock_take_id && Array.isArray(doc.stock_take_items)) {
        if (doc.stock_take_items.length > 0) {
          const { error: stockTakeItemsError } = await this.options.supabaseClient
            .from('stock_take_items')
            .insert(doc.stock_take_items)

          if (stockTakeItemsError) throw stockTakeItemsError
        }

        const { error: stockTakeStatusError } = await this.options.supabaseClient
          .from('stock_takes')
          .update({ status: 'variance_review' })
          .eq('id', doc.stock_take_id)

        if (stockTakeStatusError) throw stockTakeStatusError
        return []
      }

      if (doc.type === 'stock_take_approve' && doc.stock_take_approval?.stockTakeId) {
        const { error: stockTakeApproveError } = await this.options.supabaseClient
          .from('stock_takes')
          .update({
            status: 'approved',
            approved_by: doc.stock_take_approval.approvedBy,
            end_date: doc.stock_take_approval.endDate,
          })
          .eq('id', doc.stock_take_approval.stockTakeId)

        if (stockTakeApproveError) throw stockTakeApproveError
        return []
      }

      const transactionRow = stripTransactionFields(doc);
      const { data: txn, error: txnError } = await this.options.supabaseClient
        .from(this.table)
        .insert(transactionRow)
        .select()
        .single();

      if (txnError) {
        if (txnError.code == POSTGRES_DUPLICATE_KEY_ERROR_CODE) {
          return [await this.fetchByPrimaryKey(doc[this.primaryKey])];
        }
        throw txnError;
      }

      if (doc.type === 'sale' && Array.isArray(doc.sale_items) && doc.sale_items.length > 0) {
        const items = doc.sale_items.map((item) => ({
          transaction_id: txn.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_amount: item.total_amount,
          vat_applied: item.vat_applied ?? 0,
          etims_receipt_no: item.etims_receipt_no ?? null,
        }))

        const { error: itemsError } = await this.options.supabaseClient.from('sale_items').insert(items)
        if (itemsError) throw itemsError

        await Promise.all(
          doc.sale_items.map((item) =>
            this.options.supabaseClient.rpc('decrement_stock', {
              product_id: item.product_id,
              amount: item.quantity,
            })
          )
        )
      } else if (doc.type === 'expense' && doc.expense) {
        const { error: expenseError } = await this.options.supabaseClient.from('expenses').insert(
          stripExpenseFields(doc.expense, txn.id)
        )

        if (expenseError) throw expenseError
      } else if (doc.type === 'transfer' && doc.transfer) {
        const { error: transferError } = await this.options.supabaseClient.from('transfers').insert(
          stripTransferFields(doc.transfer)
        )

        if (transferError) throw transferError

        if (doc.costExpense?.transaction && doc.costExpense?.expense) {
          const costTxn = stripTransactionFields(doc.costExpense.transaction)
          const { data: costTxnRow, error: costTxnError } = await this.options.supabaseClient
            .from(this.table)
            .insert(costTxn)
            .select()
            .single()

          if (costTxnError) throw costTxnError

          const { error: costExpenseError } = await this.options.supabaseClient.from('expenses').insert(
            stripExpenseFields(doc.costExpense.expense, costTxnRow.id)
          )

          if (costExpenseError) throw costExpenseError
        }
      }

      return [];
    }

    const { error } = await this.options.supabaseClient.from(this.table).insert(doc);
    if (!error) {
      return [];
    }

    if (error.code == POSTGRES_DUPLICATE_KEY_ERROR_CODE) {
      return [await this.fetchByPrimaryKey(doc[this.primaryKey])];
    }

    throw error;
  }
  /**
   * Updates a row in supabase if all fields match the local state. Otherwise, the current
   * state is fetched and passed to the conflict handler.
   */
  async handleUpdate(row) {
    if (this.options.push?.customUpdateHandler) {
      return this.options.push.customUpdateHandler(row)
    }

    const updateHandler = this.options.push?.updateHandler || this.defaultUpdateHandler.bind(this);
    if (await updateHandler(row))
      return [];
    return [await this.fetchByPrimaryKey(row.newDocumentState[this.primaryKey])];
  }
  /**
   * Updates the row only if all database fields match the expected state.
   */
  async defaultUpdateHandler(row) {
    let query = this.options.supabaseClient.from(this.table).update(row.newDocumentState, { count: "exact" });
    Object.entries(row.assumedMasterState).forEach(([field, value]) => {
      const type = typeof value;
      if (type === "string" || type === "number") {
        query = query.eq(field, value);
      } else if (type === "boolean" || value === null) {
        query = query.is(field, value);
      } else {
        throw new Error(`replicateSupabase: Unsupported field of type ${type}`);
      }
    });
    const { error, count } = await query;
    if (error)
      throw error;
    return count == 1;
  }
    async fetchByPrimaryKey(primaryKeyValue) {
    const { data, error } = await this.options.supabaseClient.from(this.table).select().eq(this.primaryKey, primaryKeyValue).limit(1);
    if (error)
      throw error;
    if (data.length != 1)
      throw new Error("No row with given primary key");
    return this.rowToRxDoc(data[0]);
  }
  rowToRxDoc(row) {
    delete row[this.lastModifiedFieldName];
    return row;
  }
  rowToCheckpoint(row) {
    return {
      modified: row[this.lastModifiedFieldName],
      primaryKeyValue: row[this.primaryKey]
    };
  }
}
export {
  SupabaseReplication
};
//# sourceMappingURL=supabase-replication.js.map
