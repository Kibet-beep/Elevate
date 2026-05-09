// src/features/dashboard/hooks/useDashboardContext.js
import { useInstantAuth } from '../../../hooks/useInstantAuth'
import { useBranchContext } from '../../../context/BranchContext'

export function useDashboardContext() {
  const { business } = useInstantAuth()
  const { effectiveBranchId } = useBranchContext()
  
  const hasBusiness = Boolean(business?.id)
  
  let accessIssue = null
  let loading = false
  
  if (!hasBusiness) {
    accessIssue = 'Business not found'
    loading = true
  } else if (!effectiveBranchId && business?.role !== 'owner') {
    accessIssue = 'No branch assigned'
    loading = false
  }

  return {
    business,
    branchId: effectiveBranchId,
    loading,
    accessIssue,
  }
}
