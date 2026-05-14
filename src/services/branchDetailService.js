// src/services/branchDetailService.js
import { getDb } from '../lib/db'
import { getBranchById, upsertBranch } from '../repositories/branchesRepository'

export async function getBranchDetail(branchId, businessId) {
  if (!branchId || !businessId) return { branch: null, assignments: [] }

  const db = await getDb()

  let branch = await getBranchById(branchId)
  if (branch && branch.business_id !== businessId) {
    branch = null
  }

  const assignmentDocs = await db.branch_assignments.find({
    selector: {
      branch_id: branchId,
      _deleted: { $ne: true },
    },
  }).exec()

  return {
    branch,
    assignments: assignmentDocs.map((assignment) => ({
      id: assignment.user_id,
      role: assignment.role,
      branch_id: assignment.branch_id,
      is_active: assignment.is_active ?? true,
    })),
  }
}

export async function saveBranchDetail(branchId, businessId, fields) {
  if (!branchId) throw new Error('Branch ID required')
  if (!businessId) throw new Error('Business ID required')

  return upsertBranch({
    id: branchId,
    business_id: businessId,
    ...fields,
  })
}

export async function toggleBranchDetailActive(branchId, businessId, branch) {
  if (!branchId) throw new Error('Branch ID required')
  if (!businessId) throw new Error('Business ID required')

  return upsertBranch({
    ...branch,
    id: branchId,
    business_id: businessId,
    is_active: !branch.is_active,
  })
}

export async function archiveBranchDetail(branchId, businessId, branch) {
  if (!branchId) throw new Error('Branch ID required')
  if (!businessId) throw new Error('Business ID required')

  return upsertBranch({
    ...branch,
    id: branchId,
    business_id: businessId,
    status: 'archived',
    _deleted: true,
  })
}