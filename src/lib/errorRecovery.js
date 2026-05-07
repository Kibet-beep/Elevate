// Error recovery mechanisms for data persistence issues

export class ErrorRecovery {
  constructor(cacheManager) {
    this.cacheManager = cacheManager
    this.errorCounts = new Map()
    this.lastErrors = new Map()
  }

  // Track errors for recovery decisions
  trackError(key, error) {
    const count = this.errorCounts.get(key) || 0
    this.errorCounts.set(key, count + 1)
    this.lastErrors.set(key, { error, timestamp: Date.now() })
    
    console.warn(`Error tracked for ${key}: ${error.message} (count: ${count + 1})`)
  }

  // Check if we should attempt recovery
  shouldAttemptRecovery(key) {
    const errorCount = this.errorCounts.get(key) || 0
    const lastError = this.lastErrors.get(key)
    
    // Don't attempt recovery if we've had too many errors recently
    if (errorCount > 3 && lastError && (Date.now() - lastError.timestamp) < 60000) {
      return false
    }
    
    return true
  }

  // Attempt to recover from cache corruption
  async recoverFromCorruption(businessId, branchId = null, userId = null) {
    console.log('Attempting recovery from cache corruption')
    
    try {
      // Clear all cache layers
      this.cacheManager.invalidateProducts(businessId, branchId, userId)
      this.cacheManager.clearPersistentStorage(businessId, branchId, userId)
      
      // Reset error tracking
      const key = `products_${businessId}_${branchId || 'all'}`
      this.errorCounts.delete(key)
      this.lastErrors.delete(key)
      
      console.log('Cache corruption recovery completed')
      return true
    } catch (error) {
      console.error('Recovery failed:', error)
      return false
    }
  }

  // Validate and repair data integrity
  async validateAndRepairData(data, businessId, branchId = null, userId = null) {
    if (!Array.isArray(data)) {
      console.warn('Invalid data format, attempting repair')
      return []
    }

    // Filter out invalid items
    const validData = data.filter(item => 
      item && 
      typeof item === 'object' && 
      item.id && 
      item.name && 
      typeof item.name === 'string'
    )

    // Log repair if needed
    if (validData.length !== data.length) {
      console.log(`Data repaired: removed ${data.length - validData.length} invalid items`)
      
      // Update cache with repaired data
      this.cacheManager.setProducts(businessId, validData, branchId, userId)
    }

    return validData
  }

  // Create fallback data source
  createFallbackDataSource(businessId, branchId = null, userId = null) {
    return {
      async fetch() {
        console.log('Using fallback data source')
        
        // Try to get any available data from multiple sources
        const sources = [
          () => this.cacheManager.restoreFromPersistentStorage(businessId, branchId, userId),
          () => this.cacheManager.getProducts(businessId, branchId, userId),
        ]

        for (const source of sources) {
          try {
            const data = source()
            if (data && Array.isArray(data) && data.length > 0) {
              return data
            }
          } catch (error) {
            console.warn('Fallback source failed:', error)
          }
        }

        // Return empty array as last resort
        return []
      }
    }
  }

  // Handle initialization errors with recovery
  async handleInitializationError(error, businessId, branchId = null, fetchFunction, userId = null) {
    const key = `products_${businessId}_${branchId || 'all'}`
    
    this.trackError(key, error)
    
    if (!this.shouldAttemptRecovery(key)) {
      console.error('Too many errors, giving up on recovery')
      return { data: [], source: 'recovery_failed' }
    }

    // Attempt recovery
    if (error.message.includes('corruption') || error.message.includes('invalid')) {
      const recovered = await this.recoverFromCorruption(businessId, branchId, userId)
      if (recovered && fetchFunction) {
        try {
          const freshData = await fetchFunction()
          if (freshData && Array.isArray(freshData)) {
            this.cacheManager.setProducts(businessId, freshData, branchId, userId)
            return { data: freshData, source: 'recovered' }
          }
        } catch (fetchError) {
          console.error('Fresh fetch failed during recovery:', fetchError)
        }
      }
    }

    // Use fallback data source
    const fallback = this.createFallbackDataSource(businessId, branchId, userId)
    try {
      const fallbackData = await fallback.fetch()
      return { data: fallbackData, source: 'fallback' }
    } catch (fallbackError) {
      console.error('Fallback failed:', fallbackError)
      return { data: [], source: 'error', error: error.message }
    }
  }

  // Reset error tracking (call after successful operation)
  resetErrors(key) {
    this.errorCounts.delete(key)
    this.lastErrors.delete(key)
  }

  // Get error statistics
  getErrorStats() {
    const stats = {}
    for (const [key, count] of this.errorCounts) {
      const lastError = this.lastErrors.get(key)
      stats[key] = {
        count,
        lastError: lastError?.error?.message,
        lastErrorTime: lastError?.timestamp
      }
    }
    return stats
  }
}

// Hook to create error recovery
export function useErrorRecovery(cacheManager) {
  return useMemo(() => new ErrorRecovery(cacheManager), [cacheManager])
}
