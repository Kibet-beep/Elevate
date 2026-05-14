// src/services/businessService.js
// Repository + Service for the businesses table.
import {
  getBusinessById,
  getBusinessSettingsById,
  updateBusinessById,
} from '../repositories/businessesRepository'

export async function getBusiness(businessId) {
  return getBusinessById(businessId)
}

export async function getBusinessSettings(businessId) {
  return getBusinessSettingsById(businessId)
}

export async function updateBusiness(businessId, fields) {
  return updateBusinessById(businessId, fields)
}