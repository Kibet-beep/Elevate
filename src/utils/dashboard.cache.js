// src/utils/dashboard.cache.js
import { DASHBOARD_CACHE_KEY } from '../services/dashboard.service'

export function readDashboardCache() {
  try {
    const raw = localStorage.getItem(DASHBOARD_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeDashboardCache(data) {
  try {
    localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(data))
  } catch {
    // Silent fail
  }
}

export function clearDashboardCache() {
  try {
    localStorage.removeItem(DASHBOARD_CACHE_KEY)
  } catch {
    // Silent fail
  }
}
