// src/services/floatService.js
// Repository + Service for the float_baseline table.
import { getFloatBaseline, upsertFloatBaseline } from '../repositories/floatRepository'

export async function getFloat(businessId) {
  return getFloatBaseline(businessId)
}

export async function saveFloat(businessId, { cash, mpesa, bank }, userId) {
  const timestamp = new Date().toISOString()
  const payload = {
    cash_opening: parseFloat(cash) || 0,
    mpesa_opening: parseFloat(mpesa) || 0,
    bank_opening: parseFloat(bank) || 0,
    set_date: timestamp,
    created_by: userId,
    updated_at: timestamp,
  }

  await upsertFloatBaseline(businessId, payload)
}