import { useContext } from "react"
import { UserContext } from "../context/UserContext"
import { hasPermission, canAccessPage } from "../lib/roles"

// Hook to get current user and role
export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within UserProvider")
  }
  return context
}

// Hook to get current business_id (resolved from user profile)
export function useCurrentBusiness() {
  const { businessId, loading } = useUser()
  return { businessId, loading }
}

// Hook to check if user has a specific permission
export function usePermission(permission) {
  const { userRole } = useUser()
  return userRole && hasPermission(userRole, permission)
}

// Hook to check if user can access a specific page
export function useCanAccessPage(pathname) {
  const { userRole } = useUser()
  return userRole && canAccessPage(userRole, pathname)
}

// Hook to check if user has a specific role
export function useIsRole(role) {
  const { userRole } = useUser()
  return userRole === role
}

// Hook to check if user is owner or manager
export function useIsOwnerOrManager() {
  const { userRole } = useUser()
  return userRole === "owner" || userRole === "manager"
}

// Hook to check if user is owner
export function useIsOwner() {
  const { userRole } = useUser()
  return userRole === "owner"
}

// Hook to check if user is manager
export function useIsManager() {
  const { userRole } = useUser()
  return userRole === "manager"
}

// Hook to check if user is cashier
export function useIsCashier() {
  const { userRole } = useUser()
  return userRole === "cashier"
}
