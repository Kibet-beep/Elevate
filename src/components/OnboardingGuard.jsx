// src/components/OnboardingGuard.jsx
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useUser } from "../hooks/useRole"

export default function OnboardingGuard({ children }) {
  const navigate = useNavigate()
  const { user, userRole, businessId, loading } = useUser()

  useEffect(() => {
    if (loading) return

    // Only apply onboarding logic for owners
    if (userRole === "owner") {
      // Don't run onboarding check if we're already on the onboarding page
      if (window.location.pathname === "/onboarding") {
        return
      }

      // Check if this is a new owner who hasn't completed onboarding
      // We can determine this by checking if they have any employees
      const checkOnboardingStatus = async () => {
        try {
          const { supabase } = await import("../lib/supabase")
          
          // Check if owner has any employees (including themselves)
          const { data: employees, error } = await supabase
            .from("users")
            .select("id")
            .eq("business_id", businessId)
            .limit(1)

          if (error) {
            console.error("Error checking onboarding status:", error)
            return
          }

          // If no employees found, this is a new business - redirect to onboarding
          if (!employees || employees.length === 0) {
            console.log("New owner detected, redirecting to onboarding")
            navigate("/onboarding", { replace: true })
            return
          }

          // If employees exist, owner has completed onboarding
          console.log("Owner has completed onboarding")
        } catch (err) {
          console.error("Error in onboarding check:", err)
        }
      }

      if (businessId) {
        checkOnboardingStatus()
      }
    }
  }, [user, userRole, businessId, loading, navigate])

  // For non-owners or while loading, just render children
  if (loading || userRole !== "owner") {
    return children
  }

  // For owners, render children (they'll be redirected if needed)
  return children
}
