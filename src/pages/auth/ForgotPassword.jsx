// src/pages/auth/ForgotPassword.jsx
import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import { SessionShell, UiButton } from "../../components/ui"

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  // "form" | "sent"
  const [screen, setScreen] = useState("form")

  const handleSendReset = async () => {
    setError("")

    const trimmed = email.trim()
    if (!trimmed) { setError("Please enter your email address"); return }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed)) { setError("That doesn't look like a valid email"); return }

    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      // Supabase returns success even if the email doesn't exist (security by design)
      // We only hard-fail on a real error (network, config, etc.)
      if (resetError) {
        setError(resetError.message)
        setLoading(false)
        return
      }

      // All good — move to the "check your email" screen
      setScreen("sent")
    } catch (err) {
      setError("Something went wrong. Please try again.")
    }

    setLoading(false)
  }

  // ── SENT SCREEN ──
  if (screen === "sent") {
    return (
      <SessionShell
        badge="Email sent"
        title="Check your inbox for the reset link."
        subtitle={`We sent a password reset link to ${email.trim()}. Open the email and click the link to continue.`}
        points={[
          { title: "Open the email", text: "Find the email from Elevate in your inbox" },
          { title: "Click the link", text: "Tap the reset link inside the email" },
          { title: "Set new password", text: "Choose a strong password and you're all set" },
        ]}
        progress={[]}
        footer={
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-zinc-400">Didn't get it?</span>
            <button type="button" onClick={() => { setScreen("form"); setError("") }} className="text-emerald-300 hover:text-emerald-200 font-medium">Try again</button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="text-center">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📬</span>
            </div>
            <p className="text-zinc-400 text-sm">
              Check your spam folder if you don't see it within a few minutes.
            </p>
          </div>

          <UiButton variant="secondary" className="w-full rounded-2xl py-3.5" onClick={() => navigate("/")}>
            ← Back to sign in
          </UiButton>
        </div>
      </SessionShell>
    )
  }

  // ── FORM SCREEN ──
  return (
    <SessionShell
      badge="Reset password"
      title="Forgot your password?"
      subtitle="Enter the email address on your account and we'll send you a reset link to get back into your business."
      points={[
        { title: "Quick reset", text: "Get back into your account in under 2 minutes" },
        { title: "Secure link", text: "Reset links expire after 1 hour for security" },
        { title: "Email delivery", text: "Check your spam folder if you don't see the email" },
      ]}
      progress={[]}
      footer={
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-zinc-400">Remember your password?</span>
          <button type="button" onClick={() => navigate("/")} className="text-emerald-300 hover:text-emerald-200 font-medium">Sign in</button>
        </div>
      }
    >
      <div className="space-y-5">
        {error && <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendReset()}
              placeholder="you@business.com"
              autoFocus
              className="w-full rounded-2xl border border-white/6 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500"
            />
          </div>
        </div>

        <UiButton variant="primary" className="w-full rounded-2xl py-3.5" onClick={handleSendReset} disabled={loading}>
          {loading ? "Sending link..." : "Send reset link →"}
        </UiButton>

        <p className="text-zinc-500 text-xs text-center">
          The link expires after 1 hour for security.
        </p>
      </div>
    </SessionShell>
  )
}