// src/services/supplierService.js
// Repository + Service for the suppliers table.
import { getAllSuppliers, upsertSupplier } from '../repositories/suppliersRepository'

export async function getSuppliers(businessId) {
  return getAllSuppliers({ businessId })
}

export async function getSupplierOptions(businessId) {
  const suppliers = await getAllSuppliers({ businessId })
  return (suppliers || [])
    .filter((supplier) => supplier.is_active)
    .map((supplier) => ({ id: supplier.id, name: supplier.name }))
}

export async function createSupplier(businessId, { name, phone, email, address }) {
  if (!businessId) throw new Error('businessId required')
  if (!name) throw new Error('Supplier name required')

  await upsertSupplier({
    id: crypto.randomUUID?.() || `supplier_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    business_id: businessId,
    name,
    phone: phone || null,
    email: email || null,
    address: address || null,
    is_active: true,
  })
}

export async function toggleSupplierActive(supplierId, currentStatus) {
  if (!supplierId) throw new Error('supplierId required')

  await upsertSupplier({
    id: supplierId,
    is_active: !currentStatus,
  })
}