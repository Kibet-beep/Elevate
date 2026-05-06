// src/components/OutboxAdmin.jsx
import { useState, useEffect } from 'react'
import { runSync } from '../lib/syncEngine'

function getOutbox() {
  try {
    const raw = localStorage.getItem('elevate:outbox')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function clearFailed() {
  try {
    const items = getOutbox().filter(i => i.status !== 'failed')
    localStorage.setItem('elevate:outbox', JSON.stringify(items))
  } catch {}
}

function clearAll() {
  try {
    localStorage.removeItem('elevate:outbox')
  } catch {}
}

const TYPE_LABELS = {
  CREATE_SALE: 'Sale',
  CREATE_EXPENSE: 'Expense',
  CREATE_TRANSFER: 'Transfer',
  CREATE_STOCK_ENTRY: 'Stock entry',
  CREATE_STOCK_TAKE: 'Stock take start',
  SUBMIT_STOCK_TAKE_COUNTS: 'Stock take counts',
  APPROVE_STOCK_TAKE: 'Stock take approval',
}

export default function OutboxAdmin({ onClose }) {
  const [items, setItems] = useState(getOutbox())

  const refresh = () => setItems(getOutbox())

  const handleRetry = async () => {
    // Reset all failed to pending so syncEngine retries them
    try {
      const updated = getOutbox().map(i =>
        i.status === 'failed' ? { ...i, status: 'pending', retries: 0 } : i
      )
      localStorage.setItem('elevate:outbox', JSON.stringify(updated))
      refresh()
    } catch {}
    await runSync()
    refresh()
  }

  const handleClearFailed = () => {
    clearFailed()
    refresh()
  }

  const handleClearAll = () => {
    if (!confirm('Clear ALL queued items including pending ones? This cannot be undone.')) return
    clearAll()
    refresh()
  }

  const pending = items.filter(i => i.status === 'pending')
  const failed = items.filter(i => i.status === 'failed')
  const done = items.filter(i => i.status === 'done')

  return (
    <div className="fixed inset-0 z-[70] bg-black/70" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-5" />

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-semibold text-base">Sync Queue</h2>
            <p className="text-zinc-500 text-xs mt-0.5">{items.length} total · {pending.length} pending · {failed.length} failed</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-sm w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800">✕</button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-emerald-400 text-sm font-medium">Queue is empty</p>
            <p className="text-zinc-600 text-xs mt-1">All items have been synced</p>
          </div>
        ) : (
          <div className="space-y-2 mb-5">
            {items.map(item => (
              <div
                key={item.id}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                  item.status === 'failed'
                    ? 'bg-red-400/5 border-red-400/20'
                    : item.status === 'pending'
                    ? 'bg-amber-400/5 border-amber-400/20'
                    : 'bg-zinc-800/50 border-zinc-700'
                }`}
              >
                <div>
                  <p className="text-white text-sm font-medium">{TYPE_LABELS[item.type] || item.type}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {new Date(item.createdAt).toLocaleString('en-KE')}
                    {item.retries > 0 ? ` · ${item.retries} retries` : ''}
                  </p>
                </div>
                <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full ${
                  item.status === 'failed'
                    ? 'bg-red-400/10 text-red-400'
                    : item.status === 'pending'
                    ? 'bg-amber-400/10 text-amber-400'
                    : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {failed.length > 0 && (
            <button
              onClick={handleRetry}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl py-3.5 text-sm transition-colors"
            >
              Retry {failed.length} failed item{failed.length !== 1 ? 's' : ''}
            </button>
          )}
          {failed.length > 0 && (
            <button
              onClick={handleClearFailed}
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-xl py-3.5 text-sm transition-colors border border-red-500/20"
            >
              Discard failed items
            </button>
          )}
          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-medium rounded-xl py-3 text-sm transition-colors"
            >
              Clear entire queue
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
