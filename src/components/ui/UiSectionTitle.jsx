export function UiSectionTitle({ title, caption, className = "" }) {
  return (
    <div className={className}>
      <h3 className="text-white text-sm font-semibold tracking-tight">{title}</h3>
      {caption ? <p className="text-zinc-500 text-xs mt-0.5">{caption}</p> : null}
    </div>
  )
}
