// src/pages/auth/ForgotPassword.jsx
import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"

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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-5">
        <div className="w-full max-w-sm text-center space-y-6">
          {/* Icon */}
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">📬</span>
          </div>

          {/* Copy */}
          <div>
            <h2 className="text-white font-bold text-2xl tracking-tight">Check your email</h2>
            <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
              We sent a password reset link to
            </p>
            <p className="text-emerald-400 text-sm font-mono mt-1 font-medium">{email.trim()}</p>
          </div>

          {/* Instructions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left space-y-3">
            {[
              { step: "1", text: "Open the email from Elevate" },
              { step: "2", text: "Click the reset link inside" },
              { step: "3", text: "Choose your new password" },
            ].map((s) => (
              <div key={s.step} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                  {s.step}
                </span>
                <p className="text-zinc-300 text-sm">{s.text}</p>
              </div>
            ))}
          </div>

          {/* Didn't get it */}
          <div className="space-y-3">
            <p className="text-zinc-600 text-xs">
              Didn't get it? Check your spam folder, or{" "}
              <button
                onClick={() => { setScreen("form"); setError("") }}
                className="text-zinc-400 hover:text-white underline underline-offset-2 transition-colors"
              >
                try a different email
              </button>
              .
            </p>

            <button
              onClick={() => navigate("/")}
              className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-medium rounded-xl py-3.5 text-sm transition-colors"
            >
              ← Back to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── FORM SCREEN ──
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-5">
      <div className="w-full max-w-sm space-y-6">

        {/* Back */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm"
        >
          ← Back to sign in
        </button>

        {/* Header */}
        <div>
          <h1 className="text-white font-bold text-2xl tracking-tight">Forgot password?</h1>
          <p className="text-zinc-500 text-sm mt-1.5 leading-relaxed">
            Enter the email address on your account and we'll send you a reset link.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          {error && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="text-zinc-400 text-xs mb-2 block">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendReset()}
              placeholder="you@business.com"
              autoFocus
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
            />
          </div>

          <button
            onClick={handleSendReset}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl py-3.5 text-sm transition-colors tracking-wide"
          >
            {loading ? "Sending link..." : "Send reset link"}
          </button>
        </div>

        <p className="text-zinc-600 text-xs text-center">
          The link expires after 1 hour for security.
        </p>
      </div>
    </div>
  )
}