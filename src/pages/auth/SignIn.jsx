import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate, Link } from "react-router-dom"
import { ArrowRight, BarChart3, Boxes, LineChart, Sparkles } from "../../lib/icons"
import { SessionShell, UiButton } from "../../components/ui"
import { useUser } from "../../hooks/useRole"

export default function SignIn() {
  const navigate = useNavigate()
  const { user, loading: userLoading } = useUser()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!userLoading && user) {
      navigate("/dashboard", { replace: true })
    }
  }, [user, userLoading, navigate])

  const handleCreateAccount = async () => {
    await supabase.auth.signOut()
    navigate("/signup")
  }

  const handleSignIn = async () => {
    setError("")
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  return (
    <SessionShell
      badge="Access"
      title="Run the whole business from one calm workspace."
      subtitle="Track sales, stock, cash, and the people who keep the store moving without bouncing between disconnected tools."
      points={[
        { title: "Fast daily flow", text: "Get into the dashboard, stock, and transactions with fewer taps and less noise." },
        { title: "Money with context", text: "See sales, expenses, and transfers in the same language your team uses every day." },
        { title: "Built for the floor", text: "The interface is tuned for owners and staff who work quickly on mobile and desktop." },
      ]}
      progress={[]}
      footer={
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-zinc-400">No account yet?</span>
          <button type="button" onClick={handleCreateAccount} className="text-emerald-300 hover:text-emerald-200 font-medium">Create one</button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: BarChart3, label: "Sales" },
            { icon: Boxes, label: "Stock" },
            { icon: LineChart, label: "Cash flow" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/15 px-4 py-3">
              <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-300"><Icon className="h-4 w-4" /></div>
              <span className="text-sm text-zinc-200">{label}</span>
            </div>
          ))}
        </div>

        {error && <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@business.com"
              className="w-full rounded-2xl border border-white/6 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-white/6 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Link to="/forgot-password" className="text-xs text-zinc-400 hover:text-white">
            Forgot password?
          </Link>
          <button type="button" onClick={handleCreateAccount} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300 hover:text-emerald-200">
            Create account <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <UiButton variant="primary" className="w-full rounded-2xl py-3.5" onClick={handleSignIn} disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </UiButton>
      </div>
    </SessionShell>
  )
}