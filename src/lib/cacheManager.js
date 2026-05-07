import { 
  CacheKeys, 
  getAllProductCacheKeys, 
  getAllTransactionCacheKeys, 
  getAllBusinessCacheKeys 
} from './cacheKeys.js'

export class CacheManager {
  constructor(cacheHook, persistentStorageHook) {
    this.cache = cacheHook
    this.persistent = persistentStorageHook
  }

  // -- Products --

  setProducts(businessId, products, branchId = null, userId = null) {
    const cacheKey = branchId
      ? CacheKeys.products.branch(businessId, branchId, userId)
      : CacheKeys.products.all(businessId, userId)

    const persistentKey = CacheKeys.persistent.products(businessId, branchId || 'all', userId)

    this.cache.set(cacheKey, products)
    this.persistent.set(persistentKey, products)
  }

  getProducts(businessId, branchId = null, userId = null) {
    const cacheKey = branchId
      ? CacheKeys.products.branch(businessId, branchId, userId)
      : CacheKeys.products.all(businessId, userId)
    return this.cache.get(cacheKey)
  }

  getPersistentProducts(businessId, branchId = null, userId = null) {
    const persistentKey = CacheKeys.persistent.products(businessId, branchId || 'all', userId)
    return this.persistent.get(persistentKey)
  }

  // -- Transactions --

  setTransactions(businessId, transactions, branchId = null, userId = null) {
    const cacheKey = branchId
      ? CacheKeys.transactions.branch(businessId, branchId, userId)
      : CacheKeys.transactions.all(businessId, userId)

    const persistentKey = CacheKeys.persistent.transactions(businessId, branchId || 'all', userId)

    this.cache.set(cacheKey, transactions)
    this.persistent.set(persistentKey, transactions)
  }

  getTransactions(businessId, branchId = null, userId = null) {
    const cacheKey = branchId
      ? CacheKeys.transactions.branch(businessId, branchId, userId)
      : CacheKeys.transactions.all(businessId, userId)
    return this.cache.get(cacheKey)
  }

  // -- Invalidation --

  invalidateProducts(businessId, branchId = null, userId = null) {
    getAllProductCacheKeys(businessId, branchId, userId).forEach(key => {
      this.cache.invalidate(key)
    })
    const persistentKey = CacheKeys.persistent.products(businessId, branchId || 'all', userId)
    localStorage.removeItem(`elevate:persistent:${persistentKey}`)
  }

  invalidateTransactions(businessId, branchId = null, userId = null) {
    getAllTransactionCacheKeys(businessId, branchId, userId).forEach(key => {
      this.cache.invalidate(key)
    })
    const persistentKey = CacheKeys.persistent.transactions(businessId, branchId || 'all', userId)
    localStorage.removeItem(`elevate:persistent:${persistentKey}`)
  }

  invalidateBusiness(businessId) {
    getAllBusinessCacheKeys(businessId).forEach(key => {
      this.cache.invalidate(key)
    })
  }

  invalidateAfterProductUpdate(businessId, branchId = null, userId = null) {
    this.invalidateProducts(businessId, branchId, userId)
    this.invalidateTransactions(businessId, branchId, userId)
  }

  invalidateAfterStockEntry(businessId, branchId = null, userId = null) {
    this.invalidateProducts(businessId, branchId, userId)
    this.invalidateTransactions(businessId, branchId, userId)
  }

  invalidateAfterSale(businessId, branchId = null, userId = null) {
    this.invalidateProducts(businessId, branchId, userId)
    this.invalidateTransactions(businessId, branchId, userId)
  }

  invalidateAfterBranchAssignment(businessId, oldBranchId = null, newBranchId = null, userId = null) {
    if (oldBranchId) this.invalidateProducts(businessId, oldBranchId, userId)
    if (newBranchId) this.invalidateProducts(businessId, newBranchId, userId)
    this.invalidateProducts(businessId, null, userId)
  }

  // -- Hydration --

  async hydrateProducts(businessId, branchId = null, fetchFunction, userId = null) {
    try {
      // Persistent storage first — instant display
      const persistentData = this.getPersistentProducts(businessId, branchId, userId)
      if (persistentData && Array.isArray(persistentData) && persistentData.length > 0) {
        const cacheKey = branchId
          ? CacheKeys.products.branch(businessId, branchId, userId)
          : CacheKeys.products.all(businessId, userId)
        this.cache.set(cacheKey, persistentData)
        return { data: persistentData, source: 'persistent' }
      }

      // Memory cache next
      const cacheData = this.getProducts(businessId, branchId, userId)
      if (cacheData && Array.isArray(cacheData) && cacheData.length > 0) {
        return { data: cacheData, source: 'cache' }
      }

      // Database last resort
      if (fetchFunction) {
        const freshData = await fetchFunction()
        if (freshData && Array.isArray(freshData)) {
          const validData = await this.validateDataIntegrity(freshData)
          this.setProducts(businessId, validData, branchId, userId)
          return { data: validData, source: 'database' }
        }
      }

      return { data: [], source: 'empty' }
    } catch (error) {
      console.error('Cache hydration error:', error)
      return { data: [], source: 'error', error: error.message }
    }
  }

  // -- User session cleanup — call on logout --

  clearUserCache(userId) {
    if (!userId) return
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.includes(userId)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    console.log(`Cleared ${keysToRemove.length} cache entries for user ${userId}`)
  }

  // -- Validation --

  async validateDataIntegrity(data) {
    if (!Array.isArray(data)) return []
    return data.filter(item => item && typeof item === 'object' && item.id)
  }

  restoreFromPersistentStorage(businessId, branchId = null, userId = null) {
    try {
      const persistentData = this.getPersistentProducts(businessId, branchId, userId)
      if (persistentData && Array.isArray(persistentData)) {
        const isValid = persistentData.every(item => item && typeof item === 'object' && item.id)
        if (isValid) return persistentData
        this.clearPersistentStorage(businessId, branchId, userId)
        return null
      }
      return null
    } catch (error) {
      console.error('Persistent storage restoration error:', error)
      return null
    }
  }

  clearPersistentStorage(businessId, branchId = null, userId = null) {
    try {
      const persistentKey = CacheKeys.persistent.products(businessId, branchId || 'all', userId)
      localStorage.removeItem(`elevate:persistent:${persistentKey}`)
    } catch (error) {
      console.error('Failed to clear persistent storage:', error)
    }
  }

  async ensureInitialized(businessId, branchId = null, fetchFunction, userId = null) {
    await new Promise(resolve => setTimeout(resolve, 100))
    const result = await this.hydrateProducts(businessId, branchId, fetchFunction, userId)
    if (!result.data || result.data.length === 0) {
      if (fetchFunction) {
        const freshData = await fetchFunction()
        if (freshData && Array.isArray(freshData)) {
          this.setProducts(businessId, freshData, branchId, userId)
          return { data: freshData, source: 'database_fallback' }
        }
      }
    }
    return result
  }

  clearExpiredCache() {
    this.cache.clear()
  }
}

export function createCacheManager(cacheHook, persistentStorageHook) {
  return new CacheManager(cacheHook, persistentStorageHook)
}
