// src/repositories/transactionsRepository.js
import { getDb } from '../lib/db'
import { supabase } from '../lib/supabase'

export async function getAllTransactions({ businessId, branchId, start, end, type } = {}) {
  try {
    const db = await getDb()
    if (db && db.transactions) {
      let query = db.transactions.find()
      if (businessId) query = query.where('business_id').eq(businessId)
      if (branchId) query = query.where('branch_id').eq(branchId)
      if (type) query = query.where('type').eq(type)
      if (start) query = query.where('date').gte(start)
      if (end) query = query.where('date').lte(end)
      return await query.exec()
    }
  } catch (err) {
    // fallthrough
  }

  let q = supabase.from('transactions').select('*')
  if (businessId) q.eq('business_id', businessId)
  if (branchId) q.eq('branch_id', branchId)
  if (type) q.eq('type', type)
  if (start) q.gte('date', start)
  if (end) q.lte('date', end)
  const { data, error } = await q.order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function getTransactionById(id) {
  const db = await getDb().catch(() => null)
  if (db && db.transactions) {
    const doc = await db.transactions.findOne(id).exec()
    return doc ? doc.toJSON() : null
  }

  const { data, error } = await supabase.from('transactions').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function upsertTransaction(txn) {
  const db = await getDb().catch(() => null)
  if (db && db.transactions) {
    const toUpsert = { ...txn, _modified: Date.now() }
    await db.transactions.upsert(toUpsert)
    return toUpsert
  }

  const { data, error } = await supabase.from('transactions').upsert(txn).select().single()
  if (error) throw error
  return data
}

export async function removeTransaction(id) {
  const db = await getDb().catch(() => null)
  if (db && db.transactions) {
    const doc = await db.transactions.findOne(id).exec()
    if (doc) await doc.atomicRemove()
    return true
  }

  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
  return true
}

export default {
  getAllTransactions,
  getTransactionById,
  upsertTransaction,
  removeTransaction,
}
