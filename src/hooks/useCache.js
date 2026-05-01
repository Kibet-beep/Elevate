// src/hooks/useCache.js
import { useState, useEffect, useCallback, useRef } from 'react'

// Global cache store that persists across component unmounts
const globalCache = new Map()
const cacheTimestamps = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Simple in-memory cache with TTL
export function useCache() {
  const cacheRef = useRef(globalCache)
  
  const get = useCallback((key) => {
    const timestamp = cacheTimestamps.get(key)
    if (!timestamp || Date.now() - timestamp > CACHE_DURATION) {
      cacheRef.current.delete(key)
      cacheTimestamps.delete(key)
      return null
    }
    return cacheRef.current.get(key)
  }, [])

  const set = useCallback((key, data) => {
    cacheRef.current.set(key, data)
    cacheTimestamps.set(key, Date.now())
  }, [])

  const invalidate = useCallback((key) => {
    cacheRef.current.delete(key)
    cacheTimestamps.delete(key)
  }, [])

  const clear = useCallback(() => {
    cacheRef.current.clear()
    cacheTimestamps.clear()
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
