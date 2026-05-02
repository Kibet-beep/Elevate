// src/pages/onboarding/Done.jsx
import { useNavigate } from "react-router-dom"
import { ArrowRight, CheckCircle2, Sparkles } from "../../lib/icons"
import { supabase } from "../../lib/supabase"
import { SessionShell, UiButton } from "../../components/ui"

export default function Done() {
  const navigate = useNavigate()

  const handleBackToSignIn = async () => {
    await supabase.auth.signOut()
    navigate("/")
  }

  return (
    <SessionShell
      badge="Onboarding complete"
      title="You’re ready to run the business."
      subtitle="The setup is done, the workspace is live, and you can start tracking stock, sales, and cash flow right away."
      points={[
        { title: "Setup complete", text: "Your account and business are linked and ready." },
        { title: "Next stop sign in", text: "Return to the login screen and open the workspace from there." },
      ]}
      progressLabel="Step 2 of 2"
      progress={["Add employees", "Done"]}
      footer={<UiButton variant="primary" className="w-full rounded-2xl py-3.5" onClick={handleBackToSignIn}>Go back to sign in page <ArrowRight className="h-4 w-4" /></UiButton>}
    >
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
        <div className="rounded-[1.75rem] border border-emerald-500/15 bg-emerald-500/10 p-5 text-emerald-300 shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-white">You're all set.</h2>
          <p className="text-sm leading-6 text-zinc-400">Your business is live on Elevate. The dashboard is waiting with your first workspace view.</p>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-2">
          {[
            { icon: Sparkles, label: "Dashboard" },
            { icon: CheckCircle2, label: "Setup complete" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/15 px-4 py-3 text-left">
              <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-300"><Icon className="h-4 w-4" /></div>
              <span className="text-sm text-zinc-200">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </SessionShell>
  )
}