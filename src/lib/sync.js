const SYNC_PENDING = 'pending'
const SYNC_SYNCED = 'synced'
const SYNC_FAILED = 'failed'

export function stripSyncMetadata(doc) {
  if (!doc || typeof doc !== 'object') return doc

  // eslint-disable-next-line no-unused-vars
  const { syncStatus, syncError, syncedAt, ...rest } = doc
  return rest
}

export function withPendingSyncState(doc) {
  return {
    ...doc,
    syncStatus: SYNC_PENDING,
    syncError: null,
    syncedAt: null,
    _modified: Date.now(),
  }
}

export function withSyncedState(doc) {
  return {
    ...doc,
    syncStatus: SYNC_SYNCED,
    syncError: null,
    syncedAt: Date.now(),
    _modified: Date.now(),
  }
}

export function withFailedSyncState(doc, errorMessage) {
  return {
    ...doc,
    syncStatus: SYNC_FAILED,
    syncError: errorMessage || 'Sync failed',
    syncedAt: null,
    _modified: Date.now(),
  }
}

export async function markDocumentSyncState(collection, documentId, state, errorMessage = null) {
  if (!collection || !documentId) return

  try {
    const document = await collection.findOne(documentId).exec()
    if (!document) return

    const patch = {
      syncStatus: state,
      syncError: state === SYNC_FAILED ? (errorMessage || 'Sync failed') : null,
      syncedAt: state === SYNC_SYNCED ? Date.now() : null,
      _modified: Date.now(),
    }

    await document.incrementalPatch(patch)
  } catch (error) {
    console.warn('Failed to update sync state for document', documentId, error)
  }
}

export function attachAutoResync(replication) {
  if (typeof window === 'undefined' || !replication) return () => {}

  const triggerResync = () => {
    if (typeof replication.reSync === 'function') {
      try {
        const resyncPromise = replication.reSync()
        if (resyncPromise && typeof resyncPromise.catch === 'function') {
          void resyncPromise.catch((error) => {
            console.warn('Automatic replication resync failed', error)
          })
        }
      } catch (err) {
        console.warn('Failed to trigger resync:', err)
      }
    }
  }

  const handleOnline = () => triggerResync()
  const handleFocus = () => triggerResync()
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      triggerResync()
    }
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('focus', handleFocus)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('focus', handleFocus)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}
