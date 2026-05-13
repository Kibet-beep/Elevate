// src/services/businessService.js
// Repository + Service for the businesses table.
import { supabase } from '../lib/supabase'

export async function getBusiness(businessId) {
  if (!businessId) return null

  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single()

  if (error) throw error
  return data
}

export async function getBusinessSettings(businessId) {
  if (!businessId) return null

  const { data, error } = await supabase
    .from('businesses')
    .select('vat_rate, low_stock_threshold, financial_year_start')
    .eq('id', businessId)
    .single()

  if (error) throw error
  return data
}

export async function updateBusiness(businessId, fields) {
  if (!businessId) throw new Error('businessId required')

  const { error } = await supabase
    .from('businesses')
    .update(fields)
    .eq('id', businessId)

  if (error) throw error
}