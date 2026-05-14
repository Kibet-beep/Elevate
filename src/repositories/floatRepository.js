// src/repositories/floatRepository.js
import { getDb } from '../lib/db'
import { supabase } from '../lib/supabase'

export async function getFloatBaseline(businessId) {
  if (!businessId) return null

  try {
    const db = await getDb()
    if (db && db.float_baseline) {
      const doc = await db.float_baseline.findOne(businessId).exec()
      return doc ? doc.toJSON() : null
    }
  } catch (err) {
    // fallback to Supabase
  }

  const { data, error } = await supabase
    .from('float_baseline')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertFloatBaseline(businessId, payload) {
  if (!businessId) throw new Error('businessId required')

  try {
    const db = await getDb()
    if (db && db.float_baseline) {
      const toUpsert = { business_id: businessId, ...payload }
      await db.float_baseline.upsert(toUpsert)
      return toUpsert
    }
  } catch (err) {
    // fallback to Supabase
  }

  const { error } = await supabase
    .from('float_baseline')
    .upsert({ business_id: businessId, ...payload }, { onConflict: 'business_id' })

  if (error) throw error

  return { business_id: businessId, ...payload }
}