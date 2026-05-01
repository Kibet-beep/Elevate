import { createContext, useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

export const UserContext = createContext()

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [businessId, setBusinessId] = useState(null)
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
    // First, try to find existing user by ID (this should find users created during signup)
    const { data: existingById, error: byIdError } = await supabase
      .from("users")
      .select("id, role, business_id, full_name")
      .eq("id", authUser.id)
      .maybeSingle()

    if (!byIdError && existingById) {
      console.log("Found existing user by ID:", existingById)
      return existingById
    }

    // If not found by ID, try by email
    if (authUser.email) {
      const { data: existingByEmail } = await supabase
        .from("users")
        .select("id, role, business_id, full_name")
        .eq("email", authUser.email)
        .maybeSingle()

      if (existingByEmail) {
        console.log("Found existing user by email:", existingByEmail)
        return existingByEmail
      }
    }

    // Only create new user if none exists (this should rarely happen now)
    console.log("Creating new user for:", authUser.email)
    
    const metadata = authUser.user_metadata || {}
    const fullName = metadata.full_name || authUser.email?.split("@")[0] || "User"
    
    // For signup flow, use the role from metadata if available
    let role = metadata.role || (metadata.business_name ? "owner" : "cashier")
    let businessId = metadata.business_id || null

    // Create business if needed
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

    if (!businessId) {
      console.error("No business ID available for user creation")
      return null
    }

    // Create the user row
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

    if (insertError) {
      console.error("Error creating user:", insertError)
      
      // If it's a 409 conflict (user already exists), try to fetch them again
      if (insertError.code === '23505' || insertError.message?.includes('duplicate key')) {
        console.log("User already exists, trying to fetch existing user...")
        
        // Try one more time to find the user by ID
        const { data: retryUser } = await supabase
          .from("users")
          .select("id, role, business_id, full_name")
          .eq("id", authUser.id)
          .maybeSingle()
          
        if (retryUser) {
          console.log("Found existing user on retry:", retryUser)
          return retryUser
        }
        
        // Try by email if ID lookup failed
        if (authUser.email) {
          const { data: retryByEmail } = await supabase
            .from("users")
            .select("id, role, business_id, full_name")
            .eq("email", authUser.email)
            .maybeSingle()
            
          if (retryByEmail) {
            console.log("Found existing user by email on retry:", retryByEmail)
            return retryByEmail
          }
        }
      }
      
      return null
    }

    console.log("Created new user:", createdUser)
    return createdUser
  }

  const fetchUserRole = async (authUser) => {
    try {
      const userData = await ensureUserProfile(authUser)

      if (!userData) {
        console.error("Unable to resolve user profile for authenticated user")
        // Don't default to cashier - try to determine from metadata
        const metadata = authUser.user_metadata || {}
        const fallbackRole = metadata.business_name ? "owner" : "cashier"
        setUserRole(fallbackRole)
        setBusinessId(null)
      } else {
        console.log("Setting user role from database:", userData.role)
        setUserRole(userData?.role || "cashier")
        setBusinessId(userData?.business_id || null)
      }
    } catch (err) {
      console.error("Error fetching user role:", err)
      // Don't default to cashier on error - try metadata
      const metadata = authUser.user_metadata || {}
      const fallbackRole = metadata.business_name ? "owner" : "cashier"
      setUserRole(fallbackRole)
      setBusinessId(null)
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
    setBusinessId(null)
  }

  return (
    <UserContext.Provider
      value={{
        user,
        userRole,
        businessId,
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
