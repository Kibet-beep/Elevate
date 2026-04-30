// src/pages/auth/AuthCallback.jsx
// This page handles every email link in the app:
//   type=signup    → owner confirmed email → create DB rows → /onboarding
//   type=recovery  → password reset → show set-password form
//   type=invite    → employee invite → show welcome set-password form

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

export default function AuthCallback() {
  const navigate = useNavigate()
  const [screen, setScreen] = useState("loading") // loading | set-password | invite-password | error
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [linkType, setLinkType] = useState(null) // "recovery" | "invite"
  const [employeeName, setEmployeeName] = useState("")

  useEffect(() => {
    handleCallback()
  }, [])

  const handleCallback = async () => {
    // Supabase puts the session tokens in the URL hash after redirect.
    // Calling getSession() after a magic link automatically exchanges them.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      setScreen("error")
      return
    }

    const user = session.user

    // Read the type from the URL hash Supabase appends e.g. #type=signup
    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace("#", "?"))
    const type = params.get("type") || user.app_metadata?.invite_flow || ""

    setLinkType(type)

    // ── OWNER EMAIL CONFIRMATION ──
    if (type === "signup") {
      await handleOwnerConfirmation(user)
      return
    }

    // ── PASSWORD RECOVERY ──
    if (type === "recovery") {
      setScreen("set-password")
      return
    }

    // ── EMPLOYEE INVITE ──
    if (type === "invite") {
      // Try to get their name from our users table (owner may have pre-inserted)
      const { data: userData } = await supabase
        .from("users")
        .select("full_name")
        .eq("email", user.email)
        .single()

      setEmployeeName(userData?.full_name || "")
      setScreen("invite-password")
      return
    }

    // Fallback — if we can't determine type, check if they have a users row
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single()

    if (existingUser) {
      navigate("/dashboard")
    } else {
      await handleOwnerConfirmation(user)
    }
  }

  const handleOwnerConfirmation = async (user) => {
    // Retrieve the pending signup data we stored before they confirmed
    const pending = localStorage.getItem("pending_signup")

    if (!pending) {
      // Already processed or came from a different device — just go to dashboard
      navigate("/dashboard")
      return
    }

    const { fullName, businessName, userId } = JSON.parse(pending)

    // Check if business row already exists (avoid duplicates on re-click)
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single()

    if (existingUser) {
      localStorage.removeItem("pending_signup")
      navigate("/onboarding")
      return
    }

    // Create business row
    const { data: businessData, error: businessError } = await supabase
      .from("businesses")
      .insert({ name: businessName, type: "retail" })
      .select("id")
      .single()

    if (businessError) {
      setError("Failed to create business. Please contact support.")
      setScreen("error")
      return
    }

    // Create user row
    const { error: userError } = await supabase.from("users").insert({
      id: user.id,
      full_name: fullName,
      email: user.email,
      role: "owner",
      business_id: businessData.id,
      is_active: true,
    })

    if (userError) {
      setError("Failed to set up your account. Please contact support.")
      setScreen("error")
      return
    }

    localStorage.removeItem("pending_signup")
    navigate("/onboarding")
  }

  // ── SET PASSWORD (recovery or invite) ──
  const handleSetPassword = async () => {
    setError("")

    if (!password) { setError("Please enter a password"); return }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return }
    if (password !== confirmPassword) { setError("Passwords do not match"); return }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    if (linkType === "recovery") {
      // Password reset — go to dashboard
      navigate("/dashboard")
    } else if (linkType === "invite") {
      // Employee invite — mark their users row as active
      const { data: { user } } = await supabase.auth.getUser()
      await supabase
        .from("users")
        .update({ is_active: true })
        .eq("id", user.id)

      navigate("/dashboard")
    }

    setLoading(false)
  }

  // ── LOADING ──
  if (screen === "loading") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-5">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-zinc-500 text-sm">Verifying your link...</p>
        </div>
      </div>
    )
  }

  // ── ERROR ──
  if (screen === "error") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-5">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="w-20 h-20 bg-red-400/10 border border-red-400/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">⚠️</span>
          </div>
          <div>
            <h2 className="text-white font-bold text-2xl tracking-tight">Something went wrong</h2>
            <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
              {error || "This link may have expired or already been used. Please try again."}
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-medium rounded-xl py-3.5 text-sm transition-colors"
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    )
  }

  // ── SET PASSWORD (recovery) ──
  if (screen === "set-password") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-5">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-3">Password reset</p>
            <h1 className="text-white font-bold text-2xl tracking-tight">Set a new password</h1>
            <p className="text-zinc-500 text-sm mt-1.5">Choose something strong that you'll remember.</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            {error && (
              <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            <div>
              <label className="text-zinc-400 text-xs mb-2 block">New password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                autoFocus
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-2 block">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                onKeyDown={e => e.key === "Enter" && handleSetPassword()}
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
              />
            </div>
            <button
              onClick={handleSetPassword}
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold rounded-xl py-3.5 text-sm transition-colors tracking-wide"
            >
              {loading ? "Saving..." : "Save new password →"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── INVITE PASSWORD (employee) ──
  if (screen === "invite-password") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-5">
        <div className="w-full max-w-sm space-y-6">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">👋</span>
          </div>

          <div className="text-center">
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-2">You've been invited</p>
            <h1 className="text-white font-bold text-2xl tracking-tight">
              Welcome{employeeName ? `, ${employeeName.split(" ")[0]}` : ""} to Elevate
            </h1>
            <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
              Set your password to activate your account and get started.
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            {error && (
              <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            <div>
              <label className="text-zinc-400 text-xs mb-2 block">Choose a password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                autoFocus
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-2 block">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                onKeyDown={e => e.key === "Enter" && handleSetPassword()}
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
              />
            </div>
            <button
              onClick={handleSetPassword}
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold rounded-xl py-3.5 text-sm transition-colors tracking-wide"
            >
              {loading ? "Activating..." : "Activate my account →"}
            </button>
          </div>

          <p className="text-zinc-600 text-xs text-center">
            This link expires after 24 hours for security.
          </p>
        </div>
      </div>
    )
  }
}
