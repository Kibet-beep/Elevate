// src/repositories/inventoryRepository.js
import { supabase } from '../lib/supabase'

export async function deleteOpeningStockMovements(businessId, branchId) {
  const { error } = await supabase
    .from('inventory_movements')
    .delete()
    .eq('business_id', businessId)
    .eq('branch_id', branchId)
    .eq('movement_type', 'opening_stock')

  if (error) throw error
}

export async function insertInventoryMovements(movements) {
  const { error } = await supabase
    .from('inventory_movements')
    .insert(movements)

  if (error) throw error
}

export async function updateOpeningStockMovementReference(businessId, branchId, referenceId) {
  const { error } = await supabase
    .from('inventory_movements')
    .update({ reference_id: referenceId })
    .eq('business_id', businessId)
    .eq('branch_id', branchId)
    .eq('movement_type', 'opening_stock')
    .eq('reference_type', 'float_baseline')

  if (error) throw error
}

export async function listInventoryMovementsForBranch(businessId, branchId) {
  const { data, error } = await supabase
    .from('inventory_movements')
    .select('product_id, quantity_delta')
    .eq('business_id', businessId)
    .eq('branch_id', branchId)

  if (error) throw error
  return data || []
}
