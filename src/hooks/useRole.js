import { useCallback } from "react"
import { supabase } from "../lib/supabase"
import { hasPermission, canAccessPage } from "../lib/roles"
import { useAppStore } from "../store/useAppStore"

export function useUser() {
  const user = useAppStore((state) => state.user)
  const userRole = useAppStore((state) => state.userRole)
  const businessId = useAppStore((state) => state.businessId)
  const loading = useAppStore((state) => state.loading)
  const error = useAppStore((state) => state.error)
  const setUserRole = useAppStore((state) => state.setUserRole)
  const clearAuthSnapshot = useAppStore((state) => state.clearAuthSnapshot)

  const updateUserRole = useCallback((newRole) => {
    setUserRole(newRole)
  }, [setUserRole])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    clearAuthSnapshot()
  }, [clearAuthSnapshot])

  return {
    user,
    userRole,
    businessId,
    loading,
    error,
    updateUserRole,
    logout,
  }
}

export function useCurrentBusiness() {
  const { businessId, loading } = useUser()
  return { businessId, loading }
}

export function usePermission(permission) {
  const { userRole } = useUser()
  return userRole && hasPermission(userRole, permission)
}

export function useCanAccessPage(pathname) {
  const { userRole } = useUser()
  return userRole && canAccessPage(userRole, pathname)
}

export function useIsRole(role) {
  const { userRole } = useUser()
  return userRole === role
}

export function useIsOwnerOrManager() {
  const { userRole } = useUser()
  return userRole === "owner" || userRole === "manager"
}

export function useIsOwner() {
  const { userRole } = useUser()
  return userRole === "owner"
}

export function useIsManager() {
  const { userRole } = useUser()
  return userRole === "manager"
}

export function useIsCashier() {
  const { userRole } = useUser()
  return userRole === "cashier"
}
