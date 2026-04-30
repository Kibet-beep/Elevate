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
        fetchUserRole(session.user.id)
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
        fetchUserRole(session.user.id)
      } else {
        setUser(null)
        setUserRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserRole = async (userId) => {
    try {
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single()

      if (fetchError) {
        console.error("Error fetching user role:", fetchError)
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
