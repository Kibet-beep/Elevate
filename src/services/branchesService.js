// src/services/branchesService.js
import { upsertBranch } from '../repositories/branchesRepository'

function getBranchId() {
  return crypto.randomUUID?.() || `branch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export async function saveBranch(params) {
  const {
    branchId,
    businessId,
    name,
    code,
    address,
    phone,
    email,
  } = params || {}

  if (!businessId) throw new Error('Business is still loading. Please try again in a moment.')
  if (!name) throw new Error('Branch name is required')

  const branch = await upsertBranch({
    id: branchId || getBranchId(),
    business_id: businessId,
    name,
    code: code || null,
    address: address || null,
    phone: phone || null,
    email: email || null,
    is_active: true,
    status: 'active',
  })

  return branch
}

export async function toggleBranchActive(branch) {
  if (!branch?.id) throw new Error('Branch ID required')

  return upsertBranch({
    ...branch,
    is_active: !branch.is_active,
    status: !branch.is_active ? 'active' : branch.status || 'inactive',
  })
}

export async function archiveBranch(branch) {
  if (!branch?.id) throw new Error('Branch ID required')

  return upsertBranch({
    ...branch,
    status: 'archived',
  })
}