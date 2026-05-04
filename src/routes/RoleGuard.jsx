import { Navigate } from "react-router-dom"
import { useUser } from "../hooks/useRole"
import { canAccessPage } from "../lib/roles"

/**
 * RoleGuard component to protect routes based on user role
 * Usage: <RoleGuard requiredRoles={["owner", "manager"]}><Page /></RoleGuard>
 * Or: <RoleGuard pathname="/inventory"><Page /></RoleGuard>
 */
export default function RoleGuard({ children, requiredRoles = null, roles = null, pathname = null }) {
  const { userRole, loading } = useUser()
  const resolvedRoles = requiredRoles || roles

  // Still loading user data
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading...</p>
      </div>
    )
  }

  // Check access based on pathname (using PAGE_PERMISSIONS)
  if (pathname) {
    if (!canAccessPage(userRole, pathname)) {
      return <Navigate to="/dashboard" replace />
    }
  }

  // Check access based on required roles
  if (resolvedRoles && !resolvedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
