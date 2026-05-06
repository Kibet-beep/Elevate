// Unified cache management for consistent data flow across all pages

import { CacheKeys, getAllProductCacheKeys, getAllTransactionCacheKeys, getAllBusinessCacheKeys } from './cacheKeys.js'

export class CacheManager {
  constructor(cacheHook, persistentStorageHook) {
    this.cache = cacheHook
    this.persistent = persistentStorageHook
  }

  // Standardized product cache operations
  setProducts(businessId, products, branchId = null) {
    const cacheKey = branchId 
      ? CacheKeys.products.branch(businessId, branchId)
      : CacheKeys.products.all(businessId)
    
    const persistentKey = CacheKeys.persistent.products(businessId, branchId || 'all')
    
    // Update both cache layers for consistency
    this.cache.set(cacheKey, products)
    this.persistent.set(persistentKey, products)
  }

  getProducts(businessId, branchId = null) {
    const cacheKey = branchId 
      ? CacheKeys.products.branch(businessId, branchId)
      : CacheKeys.products.all(businessId)
    
    return this.cache.get(cacheKey)
  }

  getPersistentProducts(businessId, branchId = null) {
    const persistentKey = CacheKeys.persistent.products(businessId, branchId || 'all')
    return this.persistent.get(persistentKey)
  }

  // Standardized transaction cache operations
  setTransactions(businessId, transactions, branchId = null) {
    const cacheKey = branchId 
      ? CacheKeys.transactions.branch(businessId, branchId)
      : CacheKeys.transactions.all(businessId)
    
    const persistentKey = CacheKeys.persistent.transactions(businessId, branchId || 'all')
    
    // Update both cache layers for consistency
    this.cache.set(cacheKey, transactions)
    this.persistent.set(persistentKey, transactions)
  }

  getTransactions(businessId, branchId = null) {
    const cacheKey = branchId 
      ? CacheKeys.transactions.branch(businessId, branchId)
      : CacheKeys.transactions.all(businessId)
    
    return this.cache.get(cacheKey)
  }

  // Comprehensive invalidation strategies
  invalidateProducts(businessId, branchId = null) {
    const keys = getAllProductCacheKeys(businessId, branchId)
    
    // Invalidate all relevant product cache keys
    keys.forEach(key => {
      this.cache.invalidate(key)
    })
    
    // Also invalidate persistent storage keys
    const persistentKey = CacheKeys.persistent.products(businessId, branchId || 'all')
    this.persistent.remove?.(persistentKey) || localStorage.removeItem(`elevate:persistent:${persistentKey}`)
  }

  invalidateTransactions(businessId, branchId = null) {
    const keys = getAllTransactionCacheKeys(businessId, branchId)
    
    // Invalidate all relevant transaction cache keys
    keys.forEach(key => {
      this.cache.invalidate(key)
    })
    
    // Also invalidate persistent storage keys
    const persistentKey = CacheKeys.persistent.transactions(businessId, branchId || 'all')
    this.persistent.remove?.(persistentKey) || localStorage.removeItem(`elevate:persistent:${persistentKey}`)
  }

  invalidateBusiness(businessId) {
    const keys = getAllBusinessCacheKeys(businessId)
    
    // Invalidate all business-related cache keys
    keys.forEach(key => {
      this.cache.invalidate(key)
    })
  }

  // Comprehensive invalidation after CRUD operations
  invalidateAfterProductUpdate(businessId, branchId = null) {
    this.invalidateProducts(businessId, branchId)
    this.invalidateTransactions(businessId, branchId) // Product updates affect transactions
  }

  invalidateAfterStockEntry(businessId, branchId = null) {
    this.invalidateProducts(businessId, branchId) // Stock entries affect product quantities
    this.invalidateTransactions(businessId, branchId)
  }

  invalidateAfterSale(businessId, branchId = null) {
    this.invalidateProducts(businessId, branchId) // Sales affect product quantities
    this.invalidateTransactions(businessId, branchId)
  }

  invalidateAfterBranchAssignment(businessId, oldBranchId = null, newBranchId = null) {
    // Invalidate both old and new branch caches
    if (oldBranchId) {
      this.invalidateProducts(businessId, oldBranchId)
    }
    if (newBranchId) {
      this.invalidateProducts(businessId, newBranchId)
    }
    
    // Always invalidate the "all" cache
    this.invalidateProducts(businessId)
  }

  // Smart cache hydration with fallback and error recovery
  async hydrateProducts(businessId, branchId = null, fetchFunction) {
    try {
      // Try persistent storage first (WhatsApp-like instant display)
      const persistentData = this.getPersistentProducts(businessId, branchId)
      if (persistentData && Array.isArray(persistentData) && persistentData.length > 0) {
        // Update cache for consistency (skip validation for now)
        const cacheKey = branchId 
          ? CacheKeys.products.branch(businessId, branchId)
          : CacheKeys.products.all(businessId)
        this.cache.set(cacheKey, persistentData)
        
        return { data: persistentData, source: 'persistent' }
      }

      // Try cache next
      const cacheData = this.getProducts(businessId, branchId)
      if (cacheData && Array.isArray(cacheData) && cacheData.length > 0) {
        return { data: cacheData, source: 'cache' }
      }

      // Fetch from database as last resort
      if (fetchFunction) {
        const freshData = await fetchFunction()
        if (freshData && Array.isArray(freshData)) {
          const validData = await this.validateDataIntegrity(freshData)
          this.setProducts(businessId, validData, branchId)
          return { data: validData, source: 'database' }
        }
      }

      return { data: [], source: 'empty' }
    } catch (error) {
      console.error('Cache hydration error:', error)
      // Return empty array as fallback
      return { data: [], source: 'error', error: error.message }
    }
  }

  // Validate data integrity (relaxed to prevent false negatives)
  async validateDataIntegrity(data) {
    if (!Array.isArray(data)) {
      return []
    }

    return data.filter(item => 
      item && 
      typeof item === 'object' && 
      item.id // Only require ID, name can be optional for flexibility
    )
  }

  // Enhanced persistent storage restoration with validation
  restoreFromPersistentStorage(businessId, branchId = null) {
    try {
      const persistentData = this.getPersistentProducts(businessId, branchId)
      if (persistentData && Array.isArray(persistentData)) {
        // Validate data integrity (relaxed)
        const isValidData = persistentData.every(item => 
          item && typeof item === 'object' && item.id // Only require ID
        )
        
        if (isValidData) {
          return persistentData
        } else {
          console.warn('Invalid persistent data format, clearing storage')
          this.clearPersistentStorage(businessId, branchId)
          return null
        }
      }
      return null
    } catch (error) {
      console.error('Persistent storage restoration error:', error)
      return null
    }
  }

  // Clear corrupted persistent storage
  clearPersistentStorage(businessId, branchId = null) {
    try {
      const persistentKey = CacheKeys.persistent.products(businessId, branchId || 'all')
      localStorage.removeItem(`elevate:persistent:${persistentKey}`)
    } catch (error) {
      console.error('Failed to clear persistent storage:', error)
    }
  }

  // Ensure cache initialization sequence
  async ensureInitialized(businessId, branchId = null, fetchFunction) {
    // Wait for persistent storage to be available
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const result = await this.hydrateProducts(businessId, branchId, fetchFunction)
    
    // If no data found, try database fetch
    if (!result.data || result.data.length === 0) {
      if (fetchFunction) {
        const freshData = await fetchFunction()
        if (freshData && Array.isArray(freshData)) {
          this.setProducts(businessId, freshData, branchId)
          return { data: freshData, source: 'database_fallback' }
        }
      }
    }
    
    return result
  }

  // Cache cleanup for maintenance
  clearExpiredCache() {
    // This would be implemented based on cache TTL logic
    // For now, just clear the cache
    this.cache.clear()
  }
}

// Hook to create cache manager instance
export function useCacheManager() {
  // This would be used within components that have access to cache hooks
  // For now, we'll export a factory function
  return null
}

// Factory function to create cache manager with hooks
export function createCacheManager(cacheHook, persistentStorageHook) {
  return new CacheManager(cacheHook, persistentStorageHook)
}
