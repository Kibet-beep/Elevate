// src/components/NetworkStatus.jsx
import { useState, useEffect } from 'react'
import OutboxAdmin from './OutboxAdmin'

function getPendingCount() {
  try {
    const raw = localStorage.getItem('elevate:outbox')
    const items = raw ? JSON.parse(raw) : []
    return {
      pending: items.filter(i => i.status === 'pending').length,
      failed: items.filter(i => i.status === 'failed').length,
    }
  } catch {
    return { pending: 0, failed: 0 }
  }
}

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [counts, setCounts] = useState(getPendingCount())
  const [showAdmin, setShowAdmin] = useState(false)

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setCounts(getPendingCount()) }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const interval = setInterval(() => setCounts(getPendingCount()), 3000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  const total = counts.pending + counts.failed

  if (isOnline && total === 0) return null

  const bannerColor = !isOnline
    ? 'bg-red-500 text-white'
    : counts.failed > 0
    ? 'bg-red-500 text-white'
    : 'bg-amber-500 text-black'

  const message = !isOnline
    ? `No internet · ${total > 0 ? `${total} item${total !== 1 ? 's' : ''} queued` : 'offline'}` 
    : counts.failed > 0
    ? `${counts.failed} item${counts.failed !== 1 ? 's' : ''} failed to sync — tap to review` 
    : `Syncing ${counts.pending} item${counts.pending !== 1 ? 's' : ''}...` 

  return (
    <>
      <button
        onClick={() => setShowAdmin(true)}
        className={`fixed top-0 left-0 right-0 z-50 ${bannerColor} p-3 text-center w-full`}
      >
        <div className="flex items-center justify-center gap-2">
          {counts.failed > 0 ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : !isOnline ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M3 3l18 18" />
            </svg>
          ) : (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          )}
          <span className="text-sm font-medium">{message}</span>
        </div>
      </button>

      {showAdmin && <OutboxAdmin onClose={() => setShowAdmin(false)} />}
    </>
  )
}
