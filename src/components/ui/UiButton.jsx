const base =
  "inline-flex items-center justify-center gap-2 rounded-xl transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"

const variants = {
  primary: "bg-emerald-500 hover:bg-emerald-400 text-black",
  secondary: "bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200",
  ghost: "bg-zinc-800/70 hover:bg-zinc-700 text-zinc-200",
  tertiary: "text-zinc-300 hover:text-white",
}

const sizes = {
  sm: "px-3 py-2 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-sm",
}

export default function UiButton({
  children,
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}) {
  return (
    <button
      className={`${base} ${variants[variant] || variants.secondary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}