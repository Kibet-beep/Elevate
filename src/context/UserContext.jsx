import { createContext, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useAppStore } from "../store/useAppStore"

export const UserContext = createContext()

export function UserProvider({ children }) {
  const setAuthSnapshot = useAppStore((state) => state.setAuthSnapshot)
  const clearAuthSnapshot = useAppStore((state) => state.clearAuthSnapshot)
  const setAuthLoading = useAppStore((state) => state.setAuthLoading)
  const setAuthError = useAppStore((state) => state.setAuthError)

  useEffect(() => {
    let mounted = true

    const resolveUserSnapshot = async (authUser) => {
      const { data: userDataResponse } = await supabase
        .from("users")
        .select("*, businesses(*)")
        .eq("id", authUser.id)
        .maybeSingle()

      if (userDataResponse) {
        return {
          user: userDataResponse,
          userRole: userDataResponse.role || "cashier",
          businessId: userDataResponse.business_id || null,
          business: userDataResponse.businesses || null,
        }
      }

      const metadata = authUser.user_metadata || {}
      return {
        user: authUser,
        userRole: metadata.business_name ? "owner" : "cashier",
        businessId: metadata.business_id || null,
        business: null,
      }
    }

    const syncAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return

        if (session?.user) {
          const snapshot = await resolveUserSnapshot(session.user)
          if (mounted) setAuthSnapshot(snapshot)
        } else {
          clearAuthSnapshot()
        }
      } catch (error) {
        if (mounted) {
          setAuthError(error?.message || "Failed to sync auth state")
          clearAuthSnapshot()
        }
      } finally {
        if (mounted) setAuthLoading(false)
      }
    }

    const syncHandle =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? window.requestIdleCallback(syncAuth, { timeout: 750 })
        : window.setTimeout(syncAuth, 0)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      if (session?.user) {
        try {
          const snapshot = await resolveUserSnapshot(session.user)
          if (mounted) setAuthSnapshot(snapshot)
        } catch (error) {
          if (mounted) setAuthError(error?.message || "Failed to refresh auth state")
        }
      } else {
        clearAuthSnapshot()
      }
    })

    return () => {
      mounted = false
      if (typeof window !== "undefined" && "cancelIdleCallback" in window && typeof syncHandle === "number") {
        window.cancelIdleCallback(syncHandle)
      } else {
        window.clearTimeout(syncHandle)
      }
      subscription.unsubscribe()
    }
  }, [clearAuthSnapshot, setAuthError, setAuthLoading, setAuthSnapshot])

  return <UserContext.Provider value={null}>{children}</UserContext.Provider>
}
