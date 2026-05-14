// src/repositories/productsRepository.js
import { getDb } from '../lib/db'
import { supabase } from '../lib/supabase'

export async function getAllProducts({ businessId, branchId } = {}) {
  try {
    const db = await getDb()
    if (db && db.products) {
      let query = db.products.find()
      if (businessId) query = query.where('business_id').eq(businessId)
      if (branchId) query = query.where('branch_id').eq(branchId)
      return await query.exec()
    }
  } catch (err) {
    // fallthrough to server-side
  }

  const q = supabase.from('products').select('*')
  if (businessId) q.eq('business_id', businessId)
  if (branchId) q.eq('branch_id', branchId)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getProductById(id) {
  const db = await getDb().catch(() => null)
  if (db && db.products) {
    const doc = await db.products.findOne(id).exec()
    return doc ? doc.toJSON() : null
  }

  const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function upsertProduct(product) {
  const db = await getDb().catch(() => null)
  if (db && db.products) {
    const toUpsert = { ...product, _modified: Date.now() }
    await db.products.upsert(toUpsert)
    return toUpsert
  }

  const { data, error } = await supabase.from('products').upsert(product).select().single()
  if (error) throw error
  return data
}

export async function removeProduct(id) {
  const db = await getDb().catch(() => null)
  if (db && db.products) {
    const doc = await db.products.findOne(id).exec()
    if (doc) await doc.atomicRemove()
    return true
  }

  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
  return true
}

export default {
  getAllProducts,
  getProductById,
  upsertProduct,
  removeProduct,
}
