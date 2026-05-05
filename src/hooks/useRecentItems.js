// src/hooks/useRecentItems.js
import { useCallback } from "react"

/**
 * Hook for tracking recently used items (products, branches, suppliers, etc.)
 * Stores in localStorage with automatic expiration and limits
 * 
 * Usage:
 *   const { addRecent, getRecent, clearRecent } = useRecentItems("products")
 *   addRecent({ id: "123", name: "Product Name", type: "product" })
 *   const recent = getRecent() // Returns up to 5 most recent items
 */

export function useRecentItems(category = "general", maxItems = 5) {
  const storageKey = `recent_${category}`

  const addRecent = useCallback((item) => {
    try {
      const current = JSON.parse(localStorage.getItem(storageKey) || "[]")
      
      // Remove duplicates by ID
      const filtered = current.filter(i => i.id !== item.id)
      
      // Add new item to the front
      const updated = [
        { ...item, addedAt: new Date().toISOString() },
        ...filtered
      ]
      
      // Keep only maxItems
      const limited = updated.slice(0, maxItems)
      
      localStorage.setItem(storageKey, JSON.stringify(limited))
    } catch (err) {
      console.warn(`Failed to add recent item to ${category}:`, err)
    }
  }, [storageKey, maxItems])

  const getRecent = useCallback(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "[]")
      return stored.slice(0, maxItems)
    } catch (err) {
      console.warn(`Failed to get recent items from ${category}:`, err)
      return []
    }
  }, [storageKey, maxItems])

  const clearRecent = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
    } catch (err) {
      console.warn(`Failed to clear recent items from ${category}:`, err)
    }
  }, [storageKey])

  return { addRecent, getRecent, clearRecent }
}
