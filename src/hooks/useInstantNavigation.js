// src/hooks/useInstantNavigation.js
import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCache } from './useCache'

// Pre-loaded page components cache
const componentCache = new Map()
const dataCache = new Map()

export function useInstantNavigation() {
  const navigate = useNavigate()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const preloadTimeoutRef = useRef(null)

  // Pre-load page components
  const preloadPage = useCallback(async (route) => {
    if (componentCache.has(route)) return componentCache.get(route)
    
    try {
      let component
      switch (route) {
        case '/dashboard':
          component = await import('../pages/dashboard/Dashboard')
          break
        case '/transactions':
          component = await import('../pages/transactions/Transactions')
          break
        case '/inventory':
          component = await import('../pages/inventory/Inventory')
          break
        case '/settings':
          component = await import('../pages/settings/Settings')
          break
        case '/inventory/new-stock':
          component = await import('../pages/inventory/NewStock')
          break
        case '/transactions/add-sale':
          component = await import('../pages/transactions/AddSale')
          break
        case '/transactions/add-expense':
          component = await import('../pages/transactions/AddExpense')
          break
        default:
          return null
      }
      
      if (component) {
        componentCache.set(route, component.default)
        return component.default
      }
    } catch (error) {
      console.error(`Failed to preload ${route}:`, error)
      return null
    }
  }, [])

  // Instant navigation with pre-loading
  const navigateInstant = useCallback((to, options = {}) => {
    setIsTransitioning(true)
    
    // Clear any pending preloads
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current)
    }
    
    // Navigate immediately
    navigate(to, { ...options, replace: false })
    
    // Reset transition state after a short delay
    setTimeout(() => setIsTransitioning(false), 50)
  }, [navigate])

  // Pre-load likely next pages
  const preloadLikelyPages = useCallback((currentRoute) => {
    const likelyRoutes = {
      '/dashboard': ['/transactions', '/inventory'],
      '/transactions': ['/dashboard', '/inventory'],
      '/inventory': ['/transactions', '/inventory/new-stock'],
      '/settings': ['/dashboard'],
      '/inventory/new-stock': ['/inventory'],
      '/transactions/add-sale': ['/transactions'],
      '/transactions/add-expense': ['/transactions']
    }
    
    const routes = likelyRoutes[currentRoute] || []
    
    // Pre-load with delay to not block current navigation
    preloadTimeoutRef.current = setTimeout(() => {
      routes.forEach(route => preloadPage(route))
    }, 100)
  }, [preloadPage])

  return {
    navigateInstant,
    preloadPage,
    preloadLikelyPages,
    isTransitioning
  }
}

// Hook for optimistic updates
export function useOptimisticUpdate() {
  const { get, set, invalidate } = useCache()
  
  const updateOptimistically = useCallback((cacheKey, updateFn) => {
    const currentData = get(cacheKey) || []
    const updatedData = updateFn(currentData)
    set(cacheKey, updatedData)
    return updatedData
  }, [get, set])

  const invalidateRelated = useCallback((action) => {
    switch (action) {
      case 'transaction_added':
        invalidate('transactions')
        break
      case 'product_updated':
        invalidate('products')
        invalidate('transactions')
        break
      case 'employee_updated':
        invalidate('employees')
        break
      default:
        break
    }
  }, [invalidate])

  return {
    updateOptimistically,
    invalidateRelated
  }
}
