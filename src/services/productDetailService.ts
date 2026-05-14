// src/services/productDetailService.ts
import { getDb } from '../lib/db'

export interface UpdateProductParams {
  id: string
  name?: string
  category?: string
  unit_of_measure?: string
  selling_price?: number
  buying_price?: number
  reorder_point?: number
  branch_id?: string
}

export async function updateProduct(params: UpdateProductParams) {
  const {
    id,
    name,
    category,
    unit_of_measure,
    selling_price,
    buying_price,
    reorder_point,
    branch_id,
  } = params

  if (!id) throw new Error('Product ID required')

  const db = await getDb()

  const updateData: any = {
    _modified: Date.now(),
  }

  if (name !== undefined) updateData.name = name
  if (category !== undefined) updateData.category = category || null
  if (unit_of_measure !== undefined) updateData.unit_of_measure = unit_of_measure || null
  if (selling_price !== undefined) updateData.selling_price = selling_price
  if (buying_price !== undefined) updateData.buying_price = buying_price
  if (reorder_point !== undefined) updateData.reorder_point = reorder_point
  if (branch_id !== undefined) updateData.branch_id = branch_id

  await db.products.upsert({
    id,
    ...updateData,
  })

  return updateData
}

export async function deactivateProduct(id: string) {
  if (!id) throw new Error('Product ID required')

  const db = await getDb()

  await db.products.upsert({
    id,
    is_active: false,
    _modified: Date.now(),
  })

  return { is_active: false }
}

export async function assignProductBranch(id: string, branchId: string) {
  if (!id) throw new Error('Product ID required')
  if (!branchId) throw new Error('Branch ID required')

  const db = await getDb()

  await db.products.upsert({
    id,
    branch_id: branchId,
    _modified: Date.now(),
  })

  return { branch_id: branchId }
}
