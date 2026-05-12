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
    let timeoutId

    try {
      console.log("[SIGNOUT] START")

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error("Sign out timed out"))
        }, 10000)
      })

      const signOutPromise = supabase.auth.signOut()

      const { error } = await Promise.race([
        signOutPromise,
        timeoutPromise,
      ])

      console.log("[SIGNOUT] RESPONSE:", error)

      if (error) {
        throw error
      }
    } catch (err) {
      console.error("[SIGNOUT] ERROR:", err)
    } finally {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }

      clearAuthSnapshot()
      console.log("[SIGNOUT] CLEARED STORE")

      if (typeof window !== "undefined") {
        window.location.replace("/")
      }
    }
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
