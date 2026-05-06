// Robust data initialization system that handles authentication state dependencies
import { useMemo } from 'react'

export class DataInitializer {
  constructor(cacheManager, authHook) {
    this.cacheManager = cacheManager
    this.auth = authHook
    this.initializationPromises = new Map()
  }

  // Wait for authentication to be ready
  async waitForAuth() {
    return new Promise((resolve) => {
      const checkAuth = () => {
        if (this.auth?.business?.id && this.auth?.initialized) {
          resolve(this.auth)
        } else if (this.auth?.initialized && !this.auth?.business?.id) {
          // Auth is ready but no business - resolve anyway
          resolve(this.auth)
        } else {
          // Check again in 100ms
          setTimeout(checkAuth, 100)
        }
      }
      
      // Start checking immediately
      checkAuth()
      
      // Timeout after 5 seconds
      setTimeout(() => {
        console.warn('Auth initialization timeout')
        resolve(this.auth)
      }, 5000)
    })
  }

  // Initialize data with auth dependency
  async initializeData(dataType, businessId, branchId = null, fetchFunction) {
    const cacheKey = `${dataType}_${businessId}_${branchId || 'all'}`
    
    // Return existing promise if already initializing
    if (this.initializationPromises.has(cacheKey)) {
      return this.initializationPromises.get(cacheKey)
    }

    // Create new initialization promise
    const initPromise = this._performInitialization(dataType, businessId, branchId, fetchFunction)
    this.initializationPromises.set(cacheKey, initPromise)

    try {
      const result = await initPromise
      return result
    } finally {
      // Clean up promise after completion
      this.initializationPromises.delete(cacheKey)
    }
  }

  async _performInitialization(dataType, businessId, branchId, fetchFunction) {
    try {
      // Wait for auth to be ready
      await this.waitForAuth()
      
      // Validate business ID
      if (!businessId) {
        console.warn('No business ID available for initialization')
        return { data: [], source: 'no_business' }
      }

      // Use cache manager for hydration
      let result
      switch (dataType) {
        case 'products':
          result = await this.cacheManager.ensureInitialized(businessId, branchId, fetchFunction)
          break
        default:
          throw new Error(`Unknown data type: ${dataType}`)
      }

      console.log(`${dataType} initialization completed from: ${result.source}`)
      return result
    } catch (error) {
      console.error(`${dataType} initialization failed:`, error)
      return { data: [], source: 'error', error: error.message }
    }
  }

  // Force refresh data from database
  async forceRefresh(dataType, businessId, branchId = null, fetchFunction) {
    if (!fetchFunction) {
      throw new Error('Fetch function required for force refresh')
    }

    try {
      // Clear cache first
      if (dataType === 'products') {
        this.cacheManager.invalidateProducts(businessId, branchId)
      }

      // Wait for auth
      await this.waitForAuth()
      
      // Fetch fresh data
      const freshData = await fetchFunction()
      
      // Update cache
      if (freshData && Array.isArray(freshData)) {
        if (dataType === 'products') {
          this.cacheManager.setProducts(businessId, freshData, branchId)
        }
        return { data: freshData, source: 'force_refresh' }
      }

      return { data: [], source: 'force_refresh_empty' }
    } catch (error) {
      console.error(`Force refresh failed for ${dataType}:`, error)
      return { data: [], source: 'error', error: error.message }
    }
  }

  // Check if data is healthy and needs refresh
  async checkDataHealth(dataType, businessId, branchId = null) {
    try {
      if (!businessId) return { healthy: false, reason: 'no_business' }

      const data = await this.cacheManager.hydrateProducts(businessId, branchId)
      
      // Health checks
      const isHealthy = data.data && 
                       Array.isArray(data.data) && 
                       data.data.length > 0 &&
                       data.data.every(item => item && item.id && item.name)

      if (!isHealthy) {
        console.warn(`Data health check failed for ${dataType}, suggesting refresh`)
        return { healthy: false, reason: 'invalid_data' }
      }

      return { healthy: true, source: data.source }
    } catch (error) {
      console.error(`Data health check failed:`, error)
      return { healthy: false, reason: 'check_error', error: error.message }
    }
  }

  // Update data timestamp
  updateTimestamp(dataType, businessId, branchId = null) {
    const key = `elevate:last_update_${dataType}_${businessId}_${branchId || 'all'}`
    localStorage.setItem(key, Date.now().toString())
  }
}

// Hook to create data initializer
export function useDataInitializer(cacheManager, authHook) {
  return useMemo(() => new DataInitializer(cacheManager, authHook), [cacheManager, authHook])
}
