// src/services/supplierService.js
// Repository + Service for the suppliers table.
import { supabase } from '../lib/supabase'

export async function getSuppliers(businessId) {
  if (!businessId) return []

  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('business_id', businessId)
    .order('name')

  if (error) throw error
  return data || []
}

export async function getSupplierOptions(businessId) {
  if (!businessId) return []

  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name')
    .eq('business_id', businessId)
    .eq('is_active', true)

  if (error) throw error
  return data || []
}

export async function createSupplier(businessId, { name, phone, email, address }) {
  if (!businessId) throw new Error('businessId required')
  if (!name) throw new Error('Supplier name required')

  const { error } = await supabase
    .from('suppliers')
    .insert({
      business_id: businessId,
      name,
      phone: phone || null,
      email: email || null,
      address: address || null,
      is_active: true,
    })

  if (error) throw error
}

export async function toggleSupplierActive(supplierId, currentStatus) {
  const { error } = await supabase
    .from('suppliers')
    .update({ is_active: !currentStatus })
    .eq('id', supplierId)

  if (error) throw error
}