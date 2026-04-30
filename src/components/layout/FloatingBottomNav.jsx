import { useNavigate } from "react-router-dom"
import { ArrowUpDown, Boxes, LayoutGrid, Settings2 } from "lucide-react"

const DEFAULT_ITEMS = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Inventory", path: "/inventory" },
  { label: "Transactions", path: "/transactions" },
  { label: "Settings", path: "/settings" },
]

const PATH_ICON_MAP = {
  "/dashboard": LayoutGrid,
  "/inventory": Boxes,
  "/transactions": ArrowUpDown,
  "/settings": Settings2,
}

export default function FloatingBottomNav({
  active,
  activePath,
  items = DEFAULT_ITEMS,
  itemClassName = "px-4 py-2.5",
}) {
  const navigate = useNavigate()

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-full px-2 py-2 shadow-2xl shadow-black/60">
        {items.map((item, i) => {
          const isActive = activePath
            ? item.path === activePath
            : active === item.label.toLowerCase()
          const Icon = item.icon || PATH_ICON_MAP[item.path] || LayoutGrid

          return (
            <button
              key={i}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 ${itemClassName} rounded-full text-xs transition-all duration-200 ${
                isActive
                  ? "bg-zinc-700 text-white shadow-inner"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
              }`}
            >
              <span className={`leading-none ${isActive ? "text-emerald-400" : "text-zinc-400"}`}>
                <Icon size={18} strokeWidth={isActive ? 2.4 : 1.9} />
              </span>
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}