// src/repositories/usersRepository.js
import { getDb } from '../lib/db'
import { supabase } from '../lib/supabase'

export async function getUsersByBusiness(businessId) {
  try {
    const db = await getDb()
    if (db && db.users) {
      let query = db.users.find()
      if (businessId) query = query.where('business_id').eq(businessId)
      return await query.exec()
    }
  } catch (err) {
    // fallback
  }

  const q = supabase.from('users').select('*')
  if (businessId) q.eq('business_id', businessId)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getUserById(id) {
  const db = await getDb().catch(() => null)
  if (db && db.users) {
    const doc = await db.users.findOne(id).exec()
    return doc ? doc.toJSON() : null
  }

  const { data, error } = await supabase.from('users').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function upsertUser(user) {
  const db = await getDb().catch(() => null)
  if (db && db.users) {
    const toUpsert = { ...user, _modified: Date.now() }
    await db.users.upsert(toUpsert)
    return toUpsert
  }

  const { data, error } = await supabase.from('users').upsert(user).select().single()
  if (error) throw error
  return data
}

export async function removeUser(id) {
  const db = await getDb().catch(() => null)
  if (db && db.users) {
    const doc = await db.users.findOne(id).exec()
    if (doc) await doc.atomicRemove()
    return true
  }

  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) throw error
  return true
}

export default {
  getUsersByBusiness,
  getUserById,
  upsertUser,
  removeUser,
}
