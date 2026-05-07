// Centralized cache key management for consistent data flow
// userId is included in all keys to prevent cross-user cache bleed on shared devices

export const CacheKeys = {
  products: {
    all: (businessId, userId) => `products_${businessId}_${userId}_all`,
    branch: (businessId, branchId, userId) => `products_${businessId}_${userId}_${branchId}`,
    detail: (businessId, productId, userId) => `product_${businessId}_${userId}_${productId}`,
  },

  transactions: {
    all: (businessId, userId) => `transactions_${businessId}_${userId}`,
    branch: (businessId, branchId, userId) => `transactions_${businessId}_${userId}_${branchId}`,
    daily: (businessId, date, userId) => `transactions_${businessId}_${userId}_${date}`,
  },

  business: {
    info: (businessId) => `business_${businessId}`,
    branches: (businessId) => `branches_${businessId}`,
    employees: (businessId) => `employees_${businessId}`,
    suppliers: (businessId) => `suppliers_${businessId}`,
  },

  stock: {
    entries: (businessId) => `stock_entries_${businessId}`,
    baseline: (businessId) => `baseline_${businessId}`,
  },

  // Persistent storage keys — userId scoped to prevent bleed on shared devices
  persistent: {
    products: (businessId, branchId = 'all', userId) => 
      `products_${businessId}_${userId}_${branchId}`,
    transactions: (businessId, branchId = 'all', userId) => 
      `transactions_${businessId}_${userId}_${branchId}`,
  }
}

export const getAllProductCacheKeys = (businessId, branchId = null, userId) => {
  const keys = [CacheKeys.products.all(businessId, userId)]
  if (branchId) keys.push(CacheKeys.products.branch(businessId, branchId, userId))
  return keys
}

export const getAllTransactionCacheKeys = (businessId, branchId = null, userId) => {
  const keys = [CacheKeys.transactions.all(businessId, userId)]
  if (branchId) keys.push(CacheKeys.transactions.branch(businessId, branchId, userId))
  return keys
}

export const getAllBusinessCacheKeys = (businessId) => [
  CacheKeys.business.info(businessId),
  CacheKeys.business.branches(businessId),
  CacheKeys.business.employees(businessId),
  CacheKeys.business.suppliers(businessId),
]

export const invalidateCacheAfterSync = (type, payload, cacheManager) => {
  const businessId = payload?.business_id || payload?.transaction?.business_id
  const branchId = payload?.branch_id || payload?.transaction?.branch_id
  const userId = payload?.user_id

  if (!businessId || !userId) return

  switch (type) {
    case 'CREATE_SALE':
      getAllProductCacheKeys(businessId, branchId, userId).forEach(k => cacheManager.invalidate(k))
      getAllTransactionCacheKeys(businessId, branchId, userId).forEach(k => cacheManager.invalidate(k))
      break
    case 'CREATE_EXPENSE':
      getAllTransactionCacheKeys(businessId, branchId, userId).forEach(k => cacheManager.invalidate(k))
      break
    case 'CREATE_TRANSFER':
    case 'CREATE_STOCK_ENTRY':
    case 'CREATE_STOCK_TAKE':
    case 'SUBMIT_STOCK_TAKE_COUNTS':
    case 'APPROVE_STOCK_TAKE':
      getAllProductCacheKeys(businessId, branchId, userId).forEach(k => cacheManager.invalidate(k))
      break
  }
}
