// src/hooks/useInstantAuth.js
import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import { createCacheManager } from '../lib/cacheManager'

export function useInstantAuth() {
  const user = useAppStore((state) => state.user)
  const business = useAppStore((state) => state.business)
  const loading = useAppStore((state) => state.loading)
  const initialized = useAppStore((state) => state.initialized)
  const clearAuthSnapshot = useAppStore((state) => state.clearAuthSnapshot)
  const cacheManager = createCacheManager({ set: () => {}, get: () => null, invalidate: () => {} }, { set: () => {}, get: () => null })

  const signOut = useCallback(async () => {
    cacheManager.clearUserCache(user?.id)
    await supabase.auth.signOut()
    clearAuthSnapshot()
  }, [clearAuthSnapshot, cacheManager, user?.id])

  return {
    user,
    business,
    loading: loading && !initialized,
    initialized,
    signOut,
    checkInstantAuth: () => Boolean(user),
  }
}

export function useInstantBusiness() {
  const business = useAppStore((state) => state.business)
  const loading = useAppStore((state) => state.loading)

  return { business, loading }
}
