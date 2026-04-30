import { createContext, useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

export const UserContext = createContext()

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Get initial session and fetch user role from database
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchUserRole(session.user)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        fetchUserRole(session.user)
      } else {
        setUser(null)
        setUserRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const ensureUserProfile = async (authUser) => {
    const { data: existingById, error: byIdError } = await supabase
      .from("users")
      .select("id, role, business_id, full_name")
      .eq("id", authUser.id)
      .maybeSingle()

    if (!byIdError && existingById) return existingById

    if (authUser.email) {
      const { data: existingByEmail } = await supabase
        .from("users")
        .select("id, role, business_id, full_name")
        .eq("email", authUser.email)
        .maybeSingle()

      if (existingByEmail) return existingByEmail
    }

    const metadata = authUser.user_metadata || {}
    let businessId = metadata.business_id || null
    let role = metadata.role || null
    const fullName = metadata.full_name || authUser.email?.split("@")[0] || "User"

    if (!businessId && metadata.business_name) {
      const { data: createdBusiness, error: businessError } = await supabase
        .from("businesses")
        .insert({ name: metadata.business_name, type: "retail" })
        .select("id")
        .single()

      if (!businessError && createdBusiness?.id) {
        businessId = createdBusiness.id
      }
    }

    if (!role) {
      role = metadata.business_name ? "owner" : "cashier"
    }

    if (!businessId) return null

    const { data: createdUser, error: insertError } = await supabase
      .from("users")
      .insert({
        id: authUser.id,
        full_name: fullName,
        email: authUser.email,
        role,
        business_id: businessId,
        is_active: true,
      })
      .select("id, role, business_id, full_name")
      .single()

    if (!insertError && createdUser) return createdUser

    if (authUser.email) {
      const { data: fallbackByEmail } = await supabase
        .from("users")
        .select("id, role, business_id, full_name")
        .eq("email", authUser.email)
        .maybeSingle()

      if (fallbackByEmail) return fallbackByEmail
    }

    return null
  }

  const fetchUserRole = async (authUser) => {
    try {
      const userData = await ensureUserProfile(authUser)

      if (!userData) {
        console.error("Unable to resolve user profile for authenticated user")
        setUserRole("cashier")
      } else {
        setUserRole(userData?.role || "cashier")
      }
    } catch (err) {
      console.error("Error fetching user role:", err)
      setUserRole("cashier")
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = (newRole) => {
    setUserRole(newRole)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserRole(null)
  }

  return (
    <UserContext.Provider
      value={{
        user,
        userRole,
        loading,
        error,
        updateUserRole,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}
