// src/pages/auth/SignUp.jsx
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

export default function SignUp() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard")
    })
  }, [navigate])

  const handleSignUp = async () => {
    setError("")

    if (!fullName.trim() || !businessName.trim() || !email.trim() || !password) {
      setError("All fields are required")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    localStorage.setItem(
      "pending_signup",
      JSON.stringify({
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        email: email.trim(),
      })
    )

    // Step 1: Create auth account
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName.trim(),
          business_name: businessName.trim(),
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      localStorage.removeItem("pending_signup")
      setLoading(false)
      return
    }

    if (!data.user) {
      setError("Failed to create account")
      localStorage.removeItem("pending_signup")
      setLoading(false)
      return
    }

    // Email confirmation enabled: callback will complete account setup.
    if (!data.session) {
      setLoading(false)
      navigate("/", {
        replace: true,
        state: { message: "Check your email to confirm your account, then continue from the link." },
      })
      return
    }

    // Step 2: Sign in immediately to establish session
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    // Step 3: Create business row
    const { data: businessData, error: businessError } = await supabase
      .from("businesses")
      .insert({ name: businessName.trim(), type: "retail" })
      .select("id")
      .single()

    if (businessError) {
      setError("Failed to create business: " + businessError.message)
      setLoading(false)
      return
    }

    // Step 4: Create user row
    const { error: userError } = await supabase.from("users").insert({
      id: data.user.id,
      full_name: fullName.trim(),
      email: email.trim(),
      role: "owner",
      business_id: businessData.id,
      is_active: true,
    })

    if (userError) {
      setError("Failed to set up your account: " + userError.message)
      setLoading(false)
      return
    }

    localStorage.removeItem("pending_signup")

    setLoading(false)
    navigate("/onboarding")
  }

  // ── FORM SCREEN ──
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <div>
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-3">Get started</p>
          <h1 className="text-white font-bold text-2xl tracking-tight">Create your account</h1>
          <p className="text-zinc-500 text-sm mt-1.5 leading-relaxed">
            Set up the owner account first. You'll add your team right after.
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
            <label className="text-zinc-400 text-xs mb-2 block">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Jane Wanjiku"
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
            />
          </div>

          <div>
            <label className="text-zinc-400 text-xs mb-2 block">Business name</label>
            <input
              type="text"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              placeholder="Kamau General Store"
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
            />
          </div>

          <div>
            <label className="text-zinc-400 text-xs mb-2 block">Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@business.com"
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-400 text-xs mb-2 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
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
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
              />
            </div>
          </div>

          <button
            onClick={handleSignUp}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold rounded-xl py-3.5 text-sm transition-colors tracking-wide"
          >
            {loading ? "Creating account..." : "Create account →"}
          </button>
        </div>

        <p className="text-zinc-600 text-xs text-center">
          Already have an account?{" "}
          <Link to="/" className="text-zinc-400 hover:text-white underline underline-offset-2 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}