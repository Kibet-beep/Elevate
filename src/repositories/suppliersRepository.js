// src/repositories/suppliersRepository.js
import { getDb } from '../lib/db'
import { supabase } from '../lib/supabase'

export async function getAllSuppliers({ businessId } = {}) {
  try {
    const db = await getDb()
    if (db && db.suppliers) {
      let query = db.suppliers.find()
      if (businessId) query = query.where('business_id').eq(businessId)
      return await query.exec()
    }
  } catch (err) {
    // fallback
  }

  const q = supabase.from('suppliers').select('*')
  if (businessId) q.eq('business_id', businessId)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getSupplierById(id) {
  const db = await getDb().catch(() => null)
  if (db && db.suppliers) {
    const doc = await db.suppliers.findOne(id).exec()
    return doc ? doc.toJSON() : null
  }

  const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function upsertSupplier(supplier) {
  const db = await getDb().catch(() => null)
  if (db && db.suppliers) {
    const toUpsert = { ...supplier, _modified: Date.now() }
    await db.suppliers.upsert(toUpsert)
    return toUpsert
  }

  const { data, error } = await supabase.from('suppliers').upsert(supplier).select().single()
  if (error) throw error
  return data
}

export async function removeSupplier(id) {
  const db = await getDb().catch(() => null)
  if (db && db.suppliers) {
    const doc = await db.suppliers.findOne(id).exec()
    if (doc) await doc.atomicRemove()
    return true
  }

  const { error } = await supabase.from('suppliers').delete().eq('id', id)
  if (error) throw error
  return true
}

export default {
  getAllSuppliers,
  getSupplierById,
  upsertSupplier,
  removeSupplier,
}
