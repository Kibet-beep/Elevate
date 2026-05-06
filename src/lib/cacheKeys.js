// Centralized cache key management for consistent data flow

export const CacheKeys = {
  // Product-related cache keys
  products: {
    all: (businessId) => `products_${businessId}_all`,
    branch: (businessId, branchId) => `products_${businessId}_${branchId}`,
    detail: (businessId, productId) => `product_${businessId}_${productId}`,
  },
  
  // Transaction-related cache keys  
  transactions: {
    all: (businessId) => `transactions_${businessId}`,
    branch: (businessId, branchId) => `transactions_${businessId}_${branchId}`,
    daily: (businessId, date) => `transactions_${businessId}_${date}`,
  },
  
  // Business-related cache keys
  business: {
    info: (businessId) => `business_${businessId}`,
    branches: (businessId) => `branches_${businessId}`,
    employees: (businessId) => `employees_${businessId}`,
    suppliers: (businessId) => `suppliers_${businessId}`,
  },
  
  // Stock-related cache keys
  stock: {
    entries: (businessId) => `stock_entries_${businessId}`,
    baseline: (businessId) => `baseline_${businessId}`,
  },
  
  // Persistent storage keys (for WhatsApp-like behavior)
  persistent: {
    products: (businessId, branchId = 'all') => `products_${businessId}_${branchId}`,
    transactions: (businessId, branchId = 'all') => `transactions_${businessId}_${branchId}`,
  }
}

// Helper function to generate all product cache keys for invalidation
export const getAllProductCacheKeys = (businessId, branchId = null) => {
  const keys = [
    CacheKeys.products.all(businessId)
  ]
  
  if (branchId) {
    keys.push(CacheKeys.products.branch(businessId, branchId))
  }
  
  return keys
}

// Helper function to generate all transaction cache keys for invalidation
export const getAllTransactionCacheKeys = (businessId, branchId = null) => {
  const keys = [
    CacheKeys.transactions.all(businessId)
  ]
  
  if (branchId) {
    keys.push(CacheKeys.transactions.branch(businessId, branchId))
  }
  
  return keys
}

// Helper function to generate all business-related cache keys for invalidation
export const getAllBusinessCacheKeys = (businessId) => {
  return [
    CacheKeys.business.info(businessId),
    CacheKeys.business.branches(businessId),
    CacheKeys.business.employees(businessId),
    CacheKeys.business.suppliers(businessId),
  ]
}
