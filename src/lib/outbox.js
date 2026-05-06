// src/lib/outbox.js
// Offline write queue — stores pending operations until back online

const OUTBOX_KEY = 'elevate:outbox'

function readOutbox() {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeOutbox(items) {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(items))
  } catch (e) {
    console.warn('Failed to write outbox:', e)
  }
}

// Add a pending operation to the queue
export function enqueue(type, payload) {
  const items = readOutbox()
  const entry = {
    id: crypto.randomUUID(),
    type,         // e.g. 'CREATE_SALE'
    payload,      // the full data needed to replay this operation
    status: 'pending',
    retries: 0,
    createdAt: Date.now(),
  }
  items.push(entry)
  writeOutbox(items)
  return entry.id
}

// Get all pending items
export function getPending() {
  return readOutbox().filter(i => i.status === 'pending')
}

// Mark an item as done (remove it)
export function markDone(id) {
  const items = readOutbox().filter(i => i.id !== id)
  writeOutbox(items)
}

// Mark an item as failed and increment retries
export function markFailed(id) {
  const items = readOutbox().map(i =>
    i.id === id
      ? { ...i, status: 'failed', retries: i.retries + 1 }
      : i
  )
  writeOutbox(items)
}

// Reset failed items back to pending so they retry
export function requeueFailed() {
  const items = readOutbox().map(i =>
    i.status === 'failed' ? { ...i, status: 'pending' } : i
  )
  writeOutbox(items)
}

// How many items are pending (for UI indicators)
export function getPendingCount() {
  return getPending().length
}