// src/services/floatService.js
// Repository + Service for the float_baseline table.
import { supabase } from '../lib/supabase'

export async function getFloat(businessId) {
  if (!businessId) return null

  const { data, error } = await supabase
    .from('float_baseline')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function saveFloat(businessId, { cash, mpesa, bank }, userId) {
  if (!businessId) throw new Error('businessId required')

  const timestamp = new Date().toISOString()
  const payload = {
    business_id: businessId,
    cash_opening: parseFloat(cash) || 0,
    mpesa_opening: parseFloat(mpesa) || 0,
    bank_opening: parseFloat(bank) || 0,
    set_date: timestamp,
    created_by: userId,
    updated_at: timestamp,
  }

  const { error } = await supabase
    .from('float_baseline')
    .upsert(payload, { onConflict: 'business_id' })

  if (error) throw error
}