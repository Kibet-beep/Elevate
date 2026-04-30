export function UiCard({ children, className = "" }) {
  return (
    <section className={`bg-zinc-900 border border-zinc-800 rounded-2xl ${className}`}>
      {children}
    </section>
  )
}

export function UiCardHeader({ title, subtitle, right, className = "" }) {
  return (
    <div className={`px-4 py-3 border-b border-zinc-800 flex items-start justify-between gap-3 ${className}`}>
      <div>
        <h2 className="text-white text-sm font-semibold tracking-tight">{title}</h2>
        {subtitle ? <p className="text-zinc-500 text-xs mt-0.5">{subtitle}</p> : null}
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  )
}

export function UiSectionTitle({ title, caption }) {
  return (
    <div className="mb-3">
      <h3 className="text-white text-base font-semibold tracking-tight">{title}</h3>
      {caption ? <p className="text-zinc-500 text-xs mt-0.5">{caption}</p> : null}
    </div>
  )
}