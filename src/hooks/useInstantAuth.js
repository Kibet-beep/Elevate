// src/hooks/useInstantAuth.js
import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

export function useInstantAuth() {
  const user = useAppStore((state) => state.user)
  const business = useAppStore((state) => state.business)
  const loading = useAppStore((state) => state.loading)
  const initialized = useAppStore((state) => state.initialized)
  const clearAuthSnapshot = useAppStore((state) => state.clearAuthSnapshot)

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    clearAuthSnapshot()
  }, [clearAuthSnapshot])

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
