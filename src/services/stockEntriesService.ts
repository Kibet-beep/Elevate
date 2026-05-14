// src/services/stockEntriesService.ts
import { getDb } from '../lib/db'

export interface AdditionalCost {
  label: string
  amount: string | number
}

export interface RecordStockReceiptParams {
  businessId: string
  branchId: string
  userId: string
  isNewProduct: boolean
  productId?: string
  productName?: string
  category?: string
  supplierId?: string
  quantity: number
  totalPurchaseCost: number
  shippingClearingCost?: number
  vatType?: string
  sourcingType: string
  additionalCosts?: AdditionalCost[]
  sellingPrice: number
}

export async function recordStockReceipt(params: RecordStockReceiptParams) {
  const {
    businessId,
    branchId,
    userId,
    isNewProduct,
    productId,
    productName,
    category,
    supplierId,
    quantity,
    totalPurchaseCost,
    shippingClearingCost = 0,
    vatType = 'inclusive',
    sourcingType,
    additionalCosts = [],
    sellingPrice,
  } = params

  // Validation
  if (!businessId) throw new Error('businessId required')
  if (!branchId) throw new Error('branchId required')
  if (!userId) throw new Error('userId required')
  if (!quantity) throw new Error('Quantity required')
  if (!totalPurchaseCost) throw new Error('Total purchase cost required')
  if (isNewProduct && !productName) throw new Error('Product name required for new products')
  if (!isNewProduct && !productId) throw new Error('Product ID required for existing products')
  if (!sellingPrice) throw new Error('Selling price required')

  const db = await getDb()

  // ── COST CALCULATIONS ──
  const qty = parseFloat(String(quantity)) || 0
  const totalPurchase = parseFloat(String(totalPurchaseCost)) || 0
  const shippingClearing = parseFloat(String(shippingClearingCost)) || 0
  const unitCost = qty > 0 ? totalPurchase / qty : 0
  const stockValue = totalPurchase
  const cif = totalPurchase + shippingClearing

  const importDuty = sourcingType === 'import' ? cif * 0.25 : 0
  const idf = sourcingType === 'import' ? cif * 0.035 : 0
  const rdl = sourcingType === 'import' ? cif * 0.02 : 0
  const vatOnImport = sourcingType === 'import' ? (cif + importDuty) * 0.16 : 0
  const totalDuties = importDuty + idf + rdl + vatOnImport

  const additionalTotal = additionalCosts.reduce(
    (s, c) => s + (parseFloat(String(c.amount)) || 0),
    0
  )

  const totalLandedCost = stockValue + shippingClearing + totalDuties + additionalTotal
  const landedCostPerUnit = qty > 0 ? totalLandedCost / qty : 0

  const generateSKU = (name: string) => {
    const words = name.trim().toUpperCase().split(' ')
    const base = words.map(w => w.slice(0, 3)).join('-')
    const suffix = Math.floor(Math.random() * 900 + 100)
    return `${base}-${suffix}`
  }

  const finalProductId = isNewProduct
    ? crypto.randomUUID?.() ||
      `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    : productId

  // ── PRODUCT HANDLING ──
  if (isNewProduct) {
    await db.products.insert({
      id: finalProductId,
      business_id: businessId,
      branch_id: branchId,
      sku_id: generateSKU(productName!),
      name: productName,
      category: category || null,
      unit_of_measure: 'pcs',
      buying_price: landedCostPerUnit,
      selling_price: parseFloat(String(sellingPrice)),
      vat_type: vatType,
      current_quantity: qty,
      is_active: true,
      _modified: Date.now(),
      _deleted: false,
    })
  } else {
    const productDoc = await db.products.findOne(finalProductId).exec()
    if (!productDoc) {
      throw new Error('Selected product not found')
    }

    const nextQty = Number(productDoc.current_quantity || 0) + qty
    await productDoc.incrementalPatch({
      buying_price: landedCostPerUnit,
      selling_price: parseFloat(String(sellingPrice)),
      vat_type: vatType,
      current_quantity: nextQty,
      _modified: Date.now(),
    })
  }

  // ── STOCK ENTRY RECORDING ──
  const stockEntryId =
    crypto.randomUUID?.() ||
    `stock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  await db.stock_entries.insert({
    id: stockEntryId,
    business_id: businessId,
    branch_id: branchId,
    product_id: finalProductId,
    supplier_id: supplierId || null,
    quantity: qty,
    buying_price: unitCost,
    freight_cost: shippingClearing,
    import_duty: importDuty,
    idf,
    rdl,
    vat_on_import: vatOnImport,
    insurance: 0,
    additional_costs: additionalCosts,
    total_cost: totalLandedCost,
    created_by: userId,
    _modified: Date.now(),
    _deleted: false,
  })

  return {
    productId: finalProductId,
    stockEntryId,
    quantity: qty,
    landedCostPerUnit,
    totalLandedCost,
  }
}
