// src/repositories/transfersRepository.js
import { getDb } from '../lib/db'
import { supabase } from '../lib/supabase'

export async function getAllTransfers({ businessId, branchId, start, end } = {}) {
  try {
    const db = await getDb()
    if (db && db.transfers) {
      let query = db.transfers.find()
      if (businessId) query = query.where('business_id').eq(businessId)
      if (branchId) query = query.where('branch_id').eq(branchId)
      if (start) query = query.where('date').gte(start)
      if (end) query = query.where('date').lte(end)
      return await query.exec()
    }
  } catch (err) {
    // fallthrough to server-side
  }

  let q = supabase.from('transfers').select('*')
  if (businessId) q.eq('business_id', businessId)
  if (branchId) q.eq('branch_id', branchId)
  if (start) q.gte('date', start)
  if (end) q.lte('date', end)
  const { data, error } = await q.order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function getTransferById(id) {
  const db = await getDb().catch(() => null)
  if (db && db.transfers) {
    const doc = await db.transfers.findOne(id).exec()
    return doc ? doc.toJSON() : null
  }

  const { data, error } = await supabase.from('transfers').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function upsertTransfer(transfer) {
  const db = await getDb().catch(() => null)
  if (db && db.transfers) {
    const toUpsert = { ...transfer, _modified: Date.now() }
    await db.transfers.upsert(toUpsert)
    return toUpsert
  }

  const { data, error } = await supabase.from('transfers').upsert(transfer).select().single()
  if (error) throw error
  return data
}

export async function removeTransfer(id) {
  const db = await getDb().catch(() => null)
  if (db && db.transfers) {
    const doc = await db.transfers.findOne(id).exec()
    if (doc) await doc.atomicRemove()
    return true
  }

  const { error } = await supabase.from('transfers').delete().eq('id', id)
  if (error) throw error
  return true
}

export default {
  getAllTransfers,
  getTransferById,
  upsertTransfer,
  removeTransfer,
}
