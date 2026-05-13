// src/components/ui/SyncTicks.jsx
import React from 'react'

const TICK = (
  <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
    <path d="M1 4L4 7L10 1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" />
  </svg>
)

const configs = {
  pending: { ticks: 1, color: 'text-zinc-500', title: 'Saving…' },
  local: { ticks: 2, color: 'text-zinc-400', title: 'Saved locally, awaiting sync' },
  synced: { ticks: 2, color: 'text-emerald-400', title: 'Synced' },
  error: { ticks: 0, color: 'text-red-400', title: 'Sync failed' },
}

export function SyncTicks({ status = 'synced', className = '' }) {
  const cfg = configs[status] || configs.synced

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${cfg.color} ${className}`}
      title={cfg.title}
      aria-label={cfg.title}
    >
      {cfg.ticks === 0 && <span className="text-xs font-bold">!</span>}
      {cfg.ticks >= 1 && TICK}
      {cfg.ticks >= 2 && <span style={{ marginLeft: '-4px' }}>{TICK}</span>}
    </span>
  )
}

export default SyncTicks