// src/repositories/stockEntriesRepository.js
import { getDb } from '../lib/db'
import { supabase } from '../lib/supabase'

export async function getAllStockEntries({ businessId, branchId } = {}) {
  try {
    const db = await getDb()
    if (db && db.stock_entries) {
      let query = db.stock_entries.find()
      if (businessId) query = query.where('business_id').eq(businessId)
      if (branchId) query = query.where('branch_id').eq(branchId)
      return await query.exec()
    }
  } catch (err) {
    // fallback
  }

  const q = supabase.from('stock_entries').select('*')
  if (businessId) q.eq('business_id', businessId)
  if (branchId) q.eq('branch_id', branchId)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getStockEntryById(id) {
  const db = await getDb().catch(() => null)
  if (db && db.stock_entries) {
    const doc = await db.stock_entries.findOne(id).exec()
    return doc ? doc.toJSON() : null
  }

  const { data, error } = await supabase.from('stock_entries').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function upsertStockEntry(entry) {
  const db = await getDb().catch(() => null)
  if (db && db.stock_entries) {
    const toUpsert = { ...entry, _modified: Date.now() }
    await db.stock_entries.upsert(toUpsert)
    return toUpsert
  }

  const { data, error } = await supabase.from('stock_entries').upsert(entry).select().single()
  if (error) throw error
  return data
}

export async function removeStockEntry(id) {
  const db = await getDb().catch(() => null)
  if (db && db.stock_entries) {
    const doc = await db.stock_entries.findOne(id).exec()
    if (doc) await doc.atomicRemove()
    return true
  }

  const { error } = await supabase.from('stock_entries').delete().eq('id', id)
  if (error) throw error
  return true
}

export default {
  getAllStockEntries,
  getStockEntryById,
  upsertStockEntry,
  removeStockEntry,
}
