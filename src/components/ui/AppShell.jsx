export default function AppShell({
  title,
  subtitle,
  right,
  children,
  className = "",
  contentClassName = "",
  showHeader = true,
}) {
  return (
    <div className={`min-h-screen bg-zinc-950 ${className}`}>
      {showHeader && (title || subtitle || right) && (
        <header className="sticky top-0 z-30 w-full border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/35 to-transparent" />
          <div className="relative w-full px-4 sm:px-6 py-3 sm:py-4">
            <div className="absolute inset-0 -z-10 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_38%),radial-gradient(circle_at_top_right,rgba(63,63,70,0.35),transparent_32%)]" />
            <div className="max-w-6xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/6 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-300/90">
                  Workspace
                </span>
                {title && <h1 className="text-white font-semibold text-xl sm:text-2xl tracking-tight leading-tight">{title}</h1>}
                {subtitle && <p className="max-w-2xl text-zinc-400 text-xs sm:text-sm leading-5">{subtitle}</p>}
              </div>
              {right ? (
                <div className="flex items-center gap-2 rounded-2xl border border-white/6 bg-white/[0.03] p-1 shadow-lg shadow-black/10">
                  {right}
                </div>
              ) : null}
            </div>
          </div>
        </header>
      )}

      <main className={`max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 ${contentClassName}`}>{children}</main>
    </div>
  )
}