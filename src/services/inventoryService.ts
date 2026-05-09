// src/services/inventoryService.ts
import { supabase } from '../lib/supabase'

export interface OpeningBaselineItem {
  productId?: string
  productName: string
  quantity: number
  unitCost: number
  category?: string
  unit?: string
  buyingPrice?: number
  sellingPrice?: number
}

export interface CreateOpeningBaselineParams {
  businessId: string
  branchId: string
  openingDate: string
  userId: string
  items: OpeningBaselineItem[]
}

export async function createOpeningBaseline(params: CreateOpeningBaselineParams) {
  const { businessId, branchId, openingDate, userId, items } = params

  // Step 1: Insert new products if needed
  const newProducts = items.filter(item => !item.productId)
  let insertedProducts: any[] = []

  if (newProducts.length > 0) {
    const { data, error } = await supabase
      .from('products')
      .insert(
        newProducts.map(item => ({
          business_id: businessId,
          branch_id: branchId,
          name: item.productName,
          category: item.category || null,
          unit_of_measure: item.unit || 'pcs',
          buying_price: item.buyingPrice || item.unitCost,
          selling_price: item.sellingPrice || 0,
          is_active: true,
        }))
      )
      .select('id, name')

    if (error) throw error
    insertedProducts = data || []
  }

  // Step 2: Delete existing opening_stock movements for this branch (idempotent behavior)
  const { error: deleteError } = await supabase
    .from('inventory_movements')
    .delete()
    .eq('business_id', businessId)
    .eq('branch_id', branchId)
    .eq('movement_type', 'opening_stock')

  if (deleteError) throw deleteError

  // Step 3: Create new opening_stock movement rows
  const movementItems = items.map((item, index) => {
    const productId = item.productId || insertedProducts[index]?.id
    if (!productId) {
      throw new Error(`Failed to resolve product ID for ${item.productName}`)
    }

    return {
      business_id: businessId,
      branch_id: branchId,
      product_id: productId,
      movement_type: 'opening_stock',
      quantity_delta: item.quantity,
      unit_cost: item.unitCost,
      reference_id: null, // Will be updated after baseline creation
      reference_type: 'float_baseline',
      created_by: userId,
      created_at: new Date().toISOString(),
    }
  })

  const { error: movementError } = await supabase
    .from('inventory_movements')
    .insert(movementItems)

  if (movementError) throw movementError

  // Step 3: Save float baseline snapshot
  const snapshot = {
    branchId,
    branchName: null, // Will be populated by caller
    stockTakeDate: openingDate,
    products: items.map((item, index) => ({
      productId: item.productId || insertedProducts[index]?.id,
      productName: item.productName,
      quantity: item.quantity,
      unitCost: item.unitCost,
    })),
    createdBy: userId,
    createdAt: new Date().toISOString(),
  }

  const { data: baseline } = await supabase
    .from('float_baseline')
    .select('opening_stock')
    .eq('business_id', businessId)
    .maybeSingle()

  const existingSnapshots = Array.isArray(baseline?.opening_stock) ? baseline.opening_stock : []
  const updatedSnapshots = [
    ...existingSnapshots.filter((s: any) => s.branchId !== snapshot.branchId),
    snapshot,
  ]

  const { error: baselineError } = await supabase
    .from('float_baseline')
    .upsert({
      business_id: businessId,
      opening_stock: updatedSnapshots,
      opening_stock_date: openingDate,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id' })

  if (baselineError) throw baselineError

  // Step 4: Update movement reference_id to link to baseline snapshot
  const baselineSnapshotId = snapshot.branchId // Use branchId as snapshot identifier
  await supabase
    .from('inventory_movements')
    .update({ reference_id: baselineSnapshotId })
    .eq('business_id', businessId)
    .eq('branch_id', branchId)
    .eq('movement_type', 'opening_stock')
    .eq('reference_type', 'float_baseline')

  // Step 5: Recalculate branch inventory
  await recalculateBranchInventory(businessId, branchId)

  return { success: true, snapshot }
}

export async function recalculateBranchInventory(businessId: string, branchId: string) {
  // Aggregate movements by product
  const { data: movements, error: movementError } = await supabase
    .from('inventory_movements')
    .select('product_id, quantity_delta')
    .eq('business_id', businessId)
    .eq('branch_id', branchId)

  if (movementError) throw movementError

  // Calculate current quantities
  const inventoryByProduct = new Map<string, number>()
  movements?.forEach(movement => {
    const current = inventoryByProduct.get(movement.product_id) || 0
    inventoryByProduct.set(movement.product_id, current + movement.quantity_delta)
  })

  // Update products with calculated quantities
  const updates = Array.from(inventoryByProduct.entries()).map(([productId, quantity]) =>
    supabase
      .from('products')
      .update({ current_quantity: Math.max(0, quantity) })
      .eq('id', productId)
      .eq('business_id', businessId)
      .eq('branch_id', branchId)
  )

  const results = await Promise.all(updates)
  const failedUpdate = results.find(result => result.error)
  if (failedUpdate?.error) throw failedUpdate.error

  return { updated: updates.length }
}

export async function createInventoryMovementsForSale(
  businessId: string,
  branchId: string,
  transactionId: string,
  saleItems: Array<{
    product_id: string
    quantity: number
    unit_price?: number
    total_amount?: number
  }>,
  userId: string
) {
  const movements = saleItems.map(item => ({
    business_id: businessId,
    branch_id: branchId,
    product_id: item.product_id,
    movement_type: 'sale',
    quantity_delta: -Math.abs(item.quantity), // Negative for sales
    unit_cost: item.unit_price || 0,
    reference_id: transactionId,
    reference_type: 'transaction',
    created_by: userId,
    created_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('inventory_movements')
    .insert(movements)

  if (error) throw error

  // Recalculate inventory after sale
  await recalculateBranchInventory(businessId, branchId)

  return { movementsCreated: movements.length }
}
