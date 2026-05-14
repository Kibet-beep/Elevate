// src/repositories/branchesRepository.js
import { getDb } from '../lib/db'
import { supabase } from '../lib/supabase'

export async function getAllBranches(businessId) {
  try {
    const db = await getDb()
    if (db && db.branches) {
      let query = db.branches.find()
      if (businessId) query = query.where('business_id').eq(businessId)
      return await query.exec()
    }
  } catch (err) {
    // fallback
  }

  const q = supabase.from('branches').select('*')
  if (businessId) q.eq('business_id', businessId)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getBranchById(id) {
  const db = await getDb().catch(() => null)
  if (db && db.branches) {
    const doc = await db.branches.findOne(id).exec()
    return doc ? doc.toJSON() : null
  }

  const { data, error } = await supabase.from('branches').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function upsertBranch(branch) {
  const db = await getDb().catch(() => null)
  if (db && db.branches) {
    const toUpsert = { ...branch, _modified: Date.now() }
    await db.branches.upsert(toUpsert)
    return toUpsert
  }

  const { data, error } = await supabase.from('branches').upsert(branch).select().single()
  if (error) throw error
  return data
}

export async function removeBranch(id) {
  const db = await getDb().catch(() => null)
  if (db && db.branches) {
    const doc = await db.branches.findOne(id).exec()
    if (doc) await doc.atomicRemove()
    return true
  }

  const { error } = await supabase.from('branches').delete().eq('id', id)
  if (error) throw error
  return true
}

export default {
  getAllBranches,
  getBranchById,
  upsertBranch,
  removeBranch,
}
