import { useMemo, useState } from "react"

export default function CategorySelect({ label = "Category", value, onChange, options = [], placeholder = "Type or pick a category" }) {
  const [focused, setFocused] = useState(false)

  const normalizedOptions = useMemo(() => {
    return Array.from(new Set((options || []).map((option) => String(option || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }, [options])

  const query = String(value || "").trim()
  const lowerQuery = query.toLowerCase()
  const matches = normalizedOptions.filter((option) => option.toLowerCase().includes(lowerQuery))
  const exactMatch = normalizedOptions.some((option) => option.toLowerCase() === lowerQuery)

  const commitValue = (nextValue) => {
    onChange(nextValue)
    setFocused(false)
  }

  return (
    <div className="relative">
      <label className="mb-2 block text-xs text-zinc-400">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-700 focus:border-emerald-500"
      />

      {focused && (matches.length > 0 || query) && (
        <div className="absolute z-20 mt-2 max-h-60 w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/30">
          <div className="max-h-52 overflow-y-auto p-1">
            {matches.map((option) => (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commitValue(option)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-zinc-200 transition-colors hover:bg-zinc-800"
              >
                <span>{option}</span>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Use</span>
              </button>
            ))}

            {query && !exactMatch && (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commitValue(query)}
                className="mt-1 flex w-full items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-left text-sm text-emerald-200 transition-colors hover:bg-emerald-500/15"
              >
                <span>Add “{query}”</span>
                <span className="text-[10px] uppercase tracking-wider text-emerald-300">New</span>
              </button>
            )}

            {!query && normalizedOptions.length === 0 && (
              <div className="px-3 py-2 text-sm text-zinc-500">No categories yet</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
