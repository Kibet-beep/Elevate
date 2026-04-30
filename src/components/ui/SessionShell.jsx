import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Users } from "lucide-react"
import { UiCard } from "./UiCard"

export default function SessionShell({
  badge = "Elevate",
  title,
  subtitle,
  points = [],
  progressLabel,
  progress = [],
  children,
  footer,
  className = "",
}) {
  return (
    <div className={`relative min-h-screen overflow-hidden bg-zinc-950 text-white ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(63,63,70,0.5),transparent_30%),linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,1))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-stretch px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="grid w-full gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <aside className="hidden rounded-[2rem] border border-white/6 bg-white/[0.03] p-8 shadow-2xl shadow-black/30 lg:flex lg:flex-col lg:justify-between">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/8 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.24em] text-emerald-200/90">
                <Sparkles className="h-3.5 w-3.5" />
                {badge}
              </div>

              <div className="max-w-md space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight leading-tight text-balance">{title}</h1>
                <p className="text-sm leading-6 text-zinc-400">{subtitle}</p>
              </div>

              {points.length > 0 ? (
                <div className="space-y-3">
                  {points.map((point, index) => (
                    <div key={index} className="flex items-start gap-3 rounded-2xl border border-white/5 bg-black/15 px-4 py-3">
                      <div className="mt-0.5 rounded-full bg-emerald-500/12 p-1.5 text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{point.title}</p>
                        <p className="text-xs leading-5 text-zinc-500">{point.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-4 border-t border-white/6 pt-6">
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <Users className="h-4 w-4 text-emerald-300" />
                Built for owners, cashiers, and teams that move quickly.
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Every step keeps your business data and flow intact.
              </div>
              {progress?.length > 0 ? (
                <div className="space-y-2">
                  {progressLabel ? <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">{progressLabel}</p> : null}
                  <div className="grid gap-2">
                    {progress.map((item, index) => (
                      <div key={item} className="flex items-center gap-3 text-xs text-zinc-300">
                        <span className={`h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-emerald-400" : "bg-zinc-700"}`} />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </aside>

          <div className="flex items-center justify-center lg:justify-end">
            <UiCard className="w-full max-w-xl overflow-hidden border-white/6 bg-zinc-900/90 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="border-b border-white/5 px-5 py-4 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/8 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-200/90 lg:hidden">
                      <Sparkles className="h-3.5 w-3.5" />
                      {badge}
                    </div>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl lg:hidden">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-zinc-400 lg:hidden">{subtitle}</p>
                  </div>
                  {progress?.length > 0 ? (
                    <div className="flex items-center gap-1.5 rounded-full border border-white/6 bg-black/20 px-3 py-2">
                      {progress.map((_, index) => (
                        <span key={index} className={`h-1.5 w-8 rounded-full ${index === 0 ? "bg-emerald-400" : "bg-zinc-700/90"}`} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6 sm:py-6">
                {children}
              </div>

              {footer ? (
                <div className="border-t border-white/5 px-5 py-4 sm:px-6">
                  {footer}
                </div>
              ) : null}
            </UiCard>
          </div>
        </div>
      </div>
    </div>
  )
}