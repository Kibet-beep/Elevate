// src/services/inventoryService.ts
import { getProductById, upsertProduct } from '../repositories/productsRepository'
import { getFloatBaseline, upsertFloatBaseline } from '../repositories/floatRepository'
import {
  deleteOpeningStockMovements,
  insertInventoryMovements,
  listInventoryMovementsForBranch,
  updateOpeningStockMovementReference,
} from '../repositories/inventoryRepository'

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

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `tmp-${Date.now()}-${Math.floor(Math.random() * 1000000)}`
}

export async function createOpeningBaseline(params: CreateOpeningBaselineParams) {
  const { businessId, branchId, openingDate, userId, items } = params

  // Step 1: Insert new products if needed
  const newProducts = items.filter(item => !item.productId)
  let insertedProducts: any[] = []

  if (newProducts.length > 0) {
    insertedProducts = await Promise.all(
      newProducts.map(async (item) => {
        const id = generateId()
        await upsertProduct({
          id,
          business_id: businessId,
          branch_id: branchId,
          name: item.productName,
          category: item.category || null,
          unit_of_measure: item.unit || 'pcs',
          buying_price: item.buyingPrice || item.unitCost,
          selling_price: item.sellingPrice || 0,
          is_active: true,
          current_quantity: 0,
          _deleted: false,
        })

        return { id, name: item.productName }
      }),
    )
  }

  const insertedQueue = [...insertedProducts]
  const resolvedItems = items.map((item) => {
    if (item.productId) {
      return {
        ...item,
        resolvedProductId: item.productId,
      }
    }

    const inserted = insertedQueue.shift()
    if (!inserted?.id) {
      throw new Error(`Failed to resolve product ID for ${item.productName}`)
    }

    return {
      ...item,
      resolvedProductId: inserted.id,
    }
  })

  // Step 2: Delete existing opening_stock movements for this branch (idempotent behavior)
  await deleteOpeningStockMovements(businessId, branchId)

  // Step 3: Create new opening_stock movement rows
  const movementItems = resolvedItems.map((item) => {
    return {
      business_id: businessId,
      branch_id: branchId,
      product_id: item.resolvedProductId,
      movement_type: 'opening_stock',
      quantity_delta: item.quantity,
      unit_cost: item.unitCost,
      reference_id: null, // Will be updated after baseline creation
      reference_type: 'float_baseline',
      created_by: userId,
      created_at: new Date().toISOString(),
    }
  })

  await insertInventoryMovements(movementItems)

  // Step 3: Save float baseline snapshot
  const snapshot = {
    branchId,
    branchName: null, // Will be populated by caller
    stockTakeDate: openingDate,
    products: resolvedItems.map((item) => ({
      productId: item.resolvedProductId,
      productName: item.productName,
      quantity: item.quantity,
      unitCost: item.unitCost,
    })),
    createdBy: userId,
    createdAt: new Date().toISOString(),
  }

  const baseline = await getFloatBaseline(businessId)

  const existingSnapshots = Array.isArray(baseline?.opening_stock) ? baseline.opening_stock : []
  const updatedSnapshots = [
    ...existingSnapshots.filter((s: any) => s.branchId !== snapshot.branchId),
    snapshot,
  ]

  await upsertFloatBaseline(businessId, {
      opening_stock: updatedSnapshots,
      opening_stock_date: openingDate,
      updated_at: new Date().toISOString(),
    })

  // Step 4: Update movement reference_id to link to baseline snapshot
  const baselineSnapshotId = snapshot.branchId // Use branchId as snapshot identifier
  await updateOpeningStockMovementReference(businessId, branchId, baselineSnapshotId)

  // Step 5: Recalculate branch inventory
  await recalculateBranchInventory(businessId, branchId)

  return { success: true, snapshot }
}

export async function recalculateBranchInventory(businessId: string, branchId: string) {
  // Aggregate movements by product
  const movements = await listInventoryMovementsForBranch(businessId, branchId)

  // Calculate current quantities
  const inventoryByProduct = new Map<string, number>()
  movements?.forEach(movement => {
    const current = inventoryByProduct.get(movement.product_id) || 0
    inventoryByProduct.set(movement.product_id, current + movement.quantity_delta)
  })

  // Update products with calculated quantities
  let updated = 0
  for (const [productId, quantity] of inventoryByProduct.entries()) {
    const existing = await getProductById(productId)
    if (!existing) continue

    await upsertProduct({
      ...existing,
      business_id: businessId,
      branch_id: branchId,
      current_quantity: Math.max(0, quantity),
    })
    updated += 1
  }

  return { updated }
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

  await insertInventoryMovements(movements)

  // Recalculate inventory after sale
  await recalculateBranchInventory(businessId, branchId)

  return { movementsCreated: movements.length }
}
