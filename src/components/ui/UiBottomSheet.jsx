export default function UiBottomSheet({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null

  return (
    <div className="md:hidden fixed inset-0 z-[60] bg-black/60" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
        {title ? <p className="text-white text-sm font-semibold mb-4">{title}</p> : null}
        <div>{children}</div>
        {footer ? <div className="mt-5">{footer}</div> : null}
      </div>
    </div>
  )
}