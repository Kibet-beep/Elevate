// src/pages/auth/SignUp.jsx
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { SessionShell, UiButton } from "../../components/ui"

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

  const handleSignIn = async () => {
    await supabase.auth.signOut()
    navigate("/")
  }

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

    // Step 1: Create auth account
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          business_name: businessName.trim(),
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError("Failed to create account")
      setLoading(false)
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

    setLoading(false)
    navigate("/onboarding")
  }

  return (
    <SessionShell
      badge="Get started"
      title="Create your business account in minutes."
      subtitle="Set up your owner account first. You'll add your team right after and start managing sales, stock, and cash flow from one place."
      points={[
        { title: "Fast setup", text: "Get your business running in under 5 minutes with our streamlined onboarding." },
        { title: "Team ready", text: "Add employees and assign roles right away - no waiting for IT setup." },
        { title: "Mobile first", text: "Manage everything from your phone or desktop, wherever you are." },
      ]}
      progress={[]}
      footer={
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-zinc-400">Already have an account?</span>
          <button type="button" onClick={handleSignIn} className="text-emerald-300 hover:text-emerald-200 font-medium">Sign in</button>
        </div>
      }
    >
      <div className="space-y-5">
        {error && <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Jane Wanjiku"
              className="w-full rounded-2xl border border-white/6 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-400">Business name</label>
            <input
              type="text"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              placeholder="Kamau General Store"
              className="w-full rounded-2xl border border-white/6 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-400">Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@business.com"
              className="w-full rounded-2xl border border-white/6 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full rounded-2xl border border-white/6 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full rounded-2xl border border-white/6 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <UiButton variant="primary" className="w-full rounded-2xl py-3.5" onClick={handleSignUp} disabled={loading}>
          {loading ? "Creating account..." : "Create account →"}
        </UiButton>
      </div>
    </SessionShell>
  )
}