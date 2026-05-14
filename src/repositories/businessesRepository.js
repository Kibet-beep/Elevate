// src/repositories/businessesRepository.js
import { getDb } from '../lib/db'
import { supabase } from '../lib/supabase'

export async function getBusinessById(businessId) {
  if (!businessId) return null

  try {
    const db = await getDb()
    if (db && db.businesses) {
      const doc = await db.businesses.findOne(businessId).exec()
      return doc ? doc.toJSON() : null
    }
  } catch (err) {
    // fallback to Supabase
  }

  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single()

  if (error) throw error
  return data
}

export async function getBusinessSettingsById(businessId) {
  if (!businessId) return null

  try {
    const db = await getDb()
    if (db && db.businesses) {
      const doc = await db.businesses.findOne(businessId).exec()
      if (!doc) return null
      const data = doc.toJSON()
      return {
        vat_rate: data.vat_rate,
        low_stock_threshold: data.low_stock_threshold,
        financial_year_start: data.financial_year_start,
      }
    }
  } catch (err) {
    // fallback to Supabase
  }

  const { data, error } = await supabase
    .from('businesses')
    .select('vat_rate, low_stock_threshold, financial_year_start')
    .eq('id', businessId)
    .single()

  if (error) throw error
  return data
}

export async function updateBusinessById(businessId, fields) {
  if (!businessId) throw new Error('businessId required')

  try {
    const db = await getDb()
    if (db && db.businesses) {
      const doc = await db.businesses.findOne(businessId).exec()
      const nextFields = { ...fields, _modified: Date.now() }

      if (doc) {
        await doc.incrementalPatch(nextFields)
        return { id: businessId, ...doc.toJSON(), ...nextFields }
      }

      const upserted = { id: businessId, ...fields, _modified: Date.now() }
      await db.businesses.upsert(upserted)
      return upserted
    }
  } catch (err) {
    // fallback to Supabase
  }

  const { error } = await supabase
    .from('businesses')
    .update(fields)
    .eq('id', businessId)

  if (error) throw error

  return { id: businessId, ...fields }
}
