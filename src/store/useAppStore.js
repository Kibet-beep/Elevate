import { create } from "zustand"

const AUTH_CACHE_KEY = "elevate:auth:cache"

function readCachedAuthState() {
  if (typeof window === "undefined") {
    return {
      user: null,
      userRole: null,
      businessId: null,
      business: null,
    }
  }

  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY)
    if (!cached) {
      return {
        user: null,
        userRole: null,
        businessId: null,
        business: null,
      }
    }

    const parsed = JSON.parse(cached)
    return {
      user: parsed.user ?? null,
      userRole: parsed.userRole ?? null,
      businessId: parsed.businessId ?? null,
      business: parsed.business ?? null,
    }
  } catch (error) {
    console.warn("Failed to read cached auth state:", error)
    return {
      user: null,
      userRole: null,
      businessId: null,
      business: null,
    }
  }
}

function writeCachedAuthState(snapshot) {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(snapshot))
  } catch (error) {
    console.warn("Failed to write cached auth state:", error)
  }
}

const initialAuthState = readCachedAuthState()

export const useAppStore = create((set, get) => ({
  user: initialAuthState.user,
  userRole: initialAuthState.userRole,
  businessId: initialAuthState.businessId,
  business: initialAuthState.business,
  loading: false,
  initialized: Boolean(
    initialAuthState.user ||
      initialAuthState.userRole ||
      initialAuthState.businessId ||
      initialAuthState.business
  ),
  error: null,

  setAuthSnapshot: ({ user, userRole, businessId, business }) => {
    const snapshot = {
      user: user ?? null,
      userRole: userRole ?? null,
      businessId: businessId ?? null,
      business: business ?? null,
    }

    writeCachedAuthState(snapshot)
    set({
      ...snapshot,
      loading: false,
      initialized: true,
      error: null,
    })
  },

  clearAuthSnapshot: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_CACHE_KEY)
    }

    set({
      user: null,
      userRole: null,
      businessId: null,
      business: null,
      loading: false,
      initialized: true,
      error: null,
    })
  },

  setAuthLoading: (loading) => set({ loading }),
  setAuthError: (error) => set({ error }),

  setUserRole: (userRole) => {
    const current = get()
    const snapshot = {
      user: current.user,
      userRole: userRole ?? null,
      businessId: current.businessId,
      business: current.business,
    }

    writeCachedAuthState(snapshot)
    set({
      userRole: snapshot.userRole,
      loading: false,
      initialized: true,
      error: null,
    })
  },
}))

export { AUTH_CACHE_KEY }