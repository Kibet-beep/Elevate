// src/hooks/useCache.js
import { useCallback, useRef } from 'react'

// Global cache store that persists across component unmounts
const globalCache = new Map()
const cacheTimestamps = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const CACHE_STORAGE_PREFIX = 'elevate:cache:'

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function getStorageKey(key) {
  return `${CACHE_STORAGE_PREFIX}${key}`
}

function readPersistedEntry(key) {
  const storage = getStorage()
  if (!storage) return null

  try {
    const raw = storage.getItem(getStorageKey(key))
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed?.timestamp || Date.now() - parsed.timestamp > CACHE_DURATION) {
      storage.removeItem(getStorageKey(key))
      return null
    }

    cacheTimestamps.set(key, parsed.timestamp)
    return parsed.data ?? null
  } catch (error) {
    console.warn('Failed to read persisted cache entry:', error)
    storage.removeItem(getStorageKey(key))
    return null
  }
}

function writePersistedEntry(key, data, timestamp) {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(getStorageKey(key), JSON.stringify({ data, timestamp }))
  } catch (error) {
    console.warn('Failed to write persisted cache entry:', error)
  }
}

function removePersistedEntry(key) {
  const storage = getStorage()
  if (!storage) return

  storage.removeItem(getStorageKey(key))
}

function clearPersistedCache() {
  const storage = getStorage()
  if (!storage) return

  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index)
    if (key?.startsWith(CACHE_STORAGE_PREFIX)) {
      storage.removeItem(key)
    }
  }
}

// Simple in-memory cache with TTL
export function useCache() {
  const cacheRef = useRef(globalCache)
  
  const get = useCallback((key) => {
    const cachedValue = cacheRef.current.get(key)
    const timestamp = cacheTimestamps.get(key)
    if (cachedValue && timestamp && Date.now() - timestamp <= CACHE_DURATION) {
      return cachedValue
    }

    cacheRef.current.delete(key)
    cacheTimestamps.delete(key)

    const persistedValue = readPersistedEntry(key)
    if (persistedValue !== null) {
      cacheRef.current.set(key, persistedValue)
      return persistedValue
    }

    return null
  }, [])

  const set = useCallback((key, data) => {
    const timestamp = Date.now()
    cacheRef.current.set(key, data)
    cacheTimestamps.set(key, timestamp)
    writePersistedEntry(key, data, timestamp)
  }, [])

  const invalidate = useCallback((key) => {
    cacheRef.current.delete(key)
    cacheTimestamps.delete(key)
    removePersistedEntry(key)
  }, [])

  const clear = useCallback(() => {
    cacheRef.current.clear()
    cacheTimestamps.clear()
    clearPersistedCache()
  }, [])

  return { get, set, invalidate, clear }
}

// Pre-load data for common queries
export function usePreloadData() {
  const { get, set } = useCache()
  
  const preloadTransactions = useCallback(async (businessId) => {
    const cacheKey = `transactions_${businessId}`
    if (get(cacheKey)) return get(cacheKey)
    
    try {
      const { supabase } = await import('../lib/supabase')
      const { data } = await supabase
        .from('transactions')
        .select(`
          id, type, transaction_type_tag, payment_account, date, account_code,
          sale_items(total_amount, quantity, products(name)),
          expenses(amount, category, description)
        `)
        .eq('business_id', businessId)
        .order('date', { ascending: false })
        .limit(50)
      
      set(cacheKey, data || [])
      return data || []
    } catch (error) {
      console.error('Failed to preload transactions:', error)
      return []
    }
  }, [get, set])

  const preloadProducts = useCallback(async (businessId) => {
    const cacheKey = `products_${businessId}`
    if (get(cacheKey)) return get(cacheKey)
    
    try {
      const { supabase } = await import('../lib/supabase')
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .order('name')
      
      set(cacheKey, data || [])
      return data || []
    } catch (error) {
      console.error('Failed to preload products:', error)
      return []
    }
  }, [get, set])

  const preloadEmployees = useCallback(async (businessId) => {
    const cacheKey = `employees_${businessId}`
    if (get(cacheKey)) return get(cacheKey)
    
    try {
      const { supabase } = await import('../lib/supabase')
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at')
      
      set(cacheKey, data || [])
      return data || []
    } catch (error) {
      console.error('Failed to preload employees:', error)
      return []
    }
  }, [get, set])

  const preloadBusiness = useCallback(async (businessId) => {
    const cacheKey = `business_${businessId}`
    if (get(cacheKey)) return get(cacheKey)
    
    try {
      const { supabase } = await import('../lib/supabase')
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single()
      
      set(cacheKey, data)
      return data
    } catch (error) {
      console.error('Failed to preload business:', error)
      return null
    }
  }, [get, set])

  return {
    preloadTransactions,
    preloadProducts,
    preloadEmployees,
    preloadBusiness
  }
}
