// src/pages/auth/ResetPassword.jsx
import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { SessionShell, UiButton } from "../../components/ui"

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Check if we have the necessary tokens in the URL
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    
    if (!accessToken || !refreshToken) {
      setError("Invalid or expired reset link. Please request a new password reset.")
      setTimeout(() => navigate("/forgot-password"), 3000)
    }
  }, [searchParams, navigate])

  const handleResetPassword = async () => {
    setError("")

    if (!password) { 
      setError("Please enter a password"); 
      return 
    }
    if (password.length < 6) { 
      setError("Password must be at least 6 characters"); 
      return 
    }
    if (password !== confirmPassword) { 
      setError("Passwords do not match"); 
      return 
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
      
      // Redirect to sign in after 2 seconds
      setTimeout(() => navigate("/"), 2000)
    } catch (err) {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  // ── SUCCESS SCREEN ──
  if (success) {
    return (
      <SessionShell
        badge="Success"
        title="Password reset complete!"
        subtitle="Your password has been updated successfully. You can now sign in with your new password."
        points={[
          { title: "Password updated", text: "Your account password has been changed" },
          { title: "Secure access", text: "Your business data is now protected with your new password" },
          { title: "Ready to go", text: "Sign in and get back to managing your business" },
        ]}
        progress={[]}
        footer={
          <div className="text-center">
            <p className="text-zinc-400 text-sm">Redirecting to sign in...</p>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="text-center">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <p className="text-zinc-400 text-sm">
              You'll be redirected to the sign in page automatically.
            </p>
          </div>

          <UiButton variant="primary" className="w-full rounded-2xl py-3.5" onClick={() => navigate("/")}>
            Sign in now →
          </UiButton>
        </div>
      </SessionShell>
    )
  }

  // ── RESET FORM SCREEN ──
  return (
    <SessionShell
      badge="Set new password"
      title="Choose a new password"
      subtitle="Create a strong password to secure your business account. Make it something memorable but hard to guess."
      points={[
        { title: "Strong password", text: "Use at least 6 characters with a mix of letters and numbers" },
        { title: "Keep it secure", text: "Don't reuse passwords from other accounts" },
        { title: "Business protection", text: "This password protects your business data and transactions" },
      ]}
      progress={[]}
      footer={
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-zinc-400">Need help?</span>
          <button type="button" onClick={() => navigate("/forgot-password")} className="text-emerald-300 hover:text-emerald-200 font-medium">Request new link</button>
        </div>
      }
    >
      <div className="space-y-5">
        {error && <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">New password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              autoFocus
              className="w-full rounded-2xl border border-white/6 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              onKeyDown={e => e.key === "Enter" && handleResetPassword()}
              className="w-full rounded-2xl border border-white/6 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500"
            />
          </div>
        </div>

        <UiButton variant="primary" className="w-full rounded-2xl py-3.5" onClick={handleResetPassword} disabled={loading}>
          {loading ? "Saving..." : "Save new password →"}
        </UiButton>

        <p className="text-zinc-500 text-xs text-center">
          This reset link will expire after 1 hour for security.
        </p>
      </div>
    </SessionShell>
  )
}
