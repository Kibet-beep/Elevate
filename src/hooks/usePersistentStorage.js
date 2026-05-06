// src/hooks/usePersistentStorage.js
import { useCallback } from 'react'

const PERSISTENT_STORAGE_PREFIX = 'elevate:persistent:'

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function getStorageKey(key) {
  return `${PERSISTENT_STORAGE_PREFIX}${key}`
}

export function usePersistentStorage() {
  const get = useCallback((key) => {
    const storage = getStorage()
    if (!storage) return null

    try {
      const raw = storage.getItem(getStorageKey(key))
      if (!raw) return null
      return JSON.parse(raw)
    } catch (error) {
      console.warn('Failed to read persistent storage:', error)
      return null
    }
  }, [])

  const set = useCallback((key, data) => {
    const storage = getStorage()
    if (!storage) return

    try {
      storage.setItem(getStorageKey(key), JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to write persistent storage:', error)
    }
  }, [])

  const remove = useCallback((key) => {
    const storage = getStorage()
    if (!storage) return

    try {
      storage.removeItem(getStorageKey(key))
    } catch (error) {
      console.warn('Failed to remove from persistent storage:', error)
    }
  }, [])

  const clear = useCallback(() => {
    const storage = getStorage()
    if (!storage) return

    try {
      const keys = Object.keys(storage)
      keys.forEach(key => {
        if (key.startsWith(PERSISTENT_STORAGE_PREFIX)) {
          storage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn('Failed to clear persistent storage:', error)
    }
  }, [])

  return { get, set, remove, clear }
}
