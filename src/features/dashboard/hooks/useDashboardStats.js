// src/features/dashboard/hooks/useDashboardStats.js
import { useState } from 'react'

export function useDashboardStats(dashboard) {
  const { business, branchId } = dashboard
  const [loading, setLoading] = useState(false)

  // This hook handles stats not covered by today activity
  // For now, it's a placeholder for future dashboard-wide metrics
  // In production, this would handle things like:
  // - Low stock alerts
  // - Pending actions
  // - Overall business health metrics
  
  return { stats: null, loading }
}
