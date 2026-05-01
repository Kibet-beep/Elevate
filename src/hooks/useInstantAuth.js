// src/hooks/useInstantAuth.js
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

// Local storage keys for instant auth
const AUTH_KEY = 'elevate_auth_session'
const USER_KEY = 'elevate_user_data'

export function useInstantAuth() {
  const [user, setUser] = useState(null)
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const authCheckRef = useRef(false)

  // Check auth state instantly from local storage
  const checkInstantAuth = useCallback(() => {
    try {
      const storedAuth = localStorage.getItem(AUTH_KEY)
      const storedUser = localStorage.getItem(USER_KEY)
      
      if (storedAuth && storedUser) {
        const authData = JSON.parse(storedAuth)
        const userData = JSON.parse(storedUser)
        
        // Check if session is still valid (not expired)
        if (authData.expires_at && Date.now() < authData.expires_at * 1000) {
          setUser(userData)
          setLoading(false)
          return true
        } else {
          // Clear expired session
          localStorage.removeItem(AUTH_KEY)
          localStorage.removeItem(USER_KEY)
        }
      }
    } catch (error) {
      console.error('Error checking instant auth:', error)
      localStorage.removeItem(AUTH_KEY)
      localStorage.removeItem(USER_KEY)
    }
    return false
  }, [])

  // Save auth state to local storage for instant access
  const saveAuthState = useCallback((session, userData) => {
    try {
      if (session && userData) {
        localStorage.setItem(AUTH_KEY, JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          user: userData
        }))
        localStorage.setItem(USER_KEY, JSON.stringify(userData))
      } else {
        localStorage.removeItem(AUTH_KEY)
        localStorage.removeItem(USER_KEY)
      }
    } catch (error) {
      console.error('Error saving auth state:', error)
    }
  }, [])

  // Initialize auth state
  useEffect(() => {
    if (authCheckRef.current) return
    authCheckRef.current = true

    // First check instant auth
    const hasInstantAuth = checkInstantAuth()
    
    if (hasInstantAuth) {
      // Verify with Supabase in background
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          supabase
            .from('users')
            .select('*, businesses(*)')
            .eq('id', session.user.id)
            .single()
            .then(({ data, error }) => {
              if (data && !error) {
                setUser(data)
                setBusiness(data.businesses)
                saveAuthState(session, data)
              } else {
                // Invalid session, clear everything
                setUser(null)
                setBusiness(null)
                saveAuthState(null, null)
              }
            })
        } else {
          // No session, clear everything
          setUser(null)
          setBusiness(null)
          saveAuthState(null, null)
        }
        setInitialized(true)
      })
    } else {
      // No instant auth, check with Supabase
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          supabase
            .from('users')
            .select('*, businesses(*)')
            .eq('id', session.user.id)
            .single()
            .then(({ data, error }) => {
              if (data && !error) {
                setUser(data)
                setBusiness(data.businesses)
                saveAuthState(session, data)
              }
            })
        }
        setInitialized(true)
        setLoading(false)
      })
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const { data } = await supabase
            .from('users')
            .select('*, businesses(*)')
            .eq('id', session.user.id)
            .single()
          
          if (data) {
            setUser(data)
            setBusiness(data.businesses)
            saveAuthState(session, data)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setBusiness(null)
          saveAuthState(null, null)
        }
        setLoading(false)
        setInitialized(true)
      }
    )

    return () => subscription.unsubscribe()
  }, [checkInstantAuth, saveAuthState])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setBusiness(null)
    saveAuthState(null, null)
  }, [saveAuthState])

  return {
    user,
    business,
    loading: loading && !initialized,
    initialized,
    signOut,
    checkInstantAuth
  }
}

// Hook for business data with instant loading
export function useInstantBusiness() {
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useInstantAuth()

  useEffect(() => {
    if (user?.businesses) {
      setBusiness(user.businesses)
      setLoading(false)
    } else if (user?.business_id) {
      // Fallback for older data structure
      const { supabase } = require('../lib/supabase')
      supabase
        .from('businesses')
        .select('*')
        .eq('id', user.business_id)
        .single()
        .then(({ data }) => {
          setBusiness(data)
          setLoading(false)
        })
    }
  }, [user])

  return { business, loading }
}
