// src/services/employeeDetailService.js
import { getDb, startBranchAssignmentsReplication } from '../lib/db'
import { supabase } from '../lib/supabase'
import { getUserById, upsertUser } from '../repositories/usersRepository'

export async function loadEmployeeDetail({ businessId, employeeId, canViewAll, effectiveBranchId }) {
  if (!businessId) throw new Error('Business not loaded')
  if (!employeeId) throw new Error('Employee not loaded')

  const db = await getDb()
  try {
    startBranchAssignmentsReplication(db.branch_assignments, businessId)
  } catch (error) {
    console.error('Failed to start branch assignments replication:', error)
  }

  const employee = await getUserById(employeeId)
  if (!employee || employee.business_id !== businessId) {
    return { employee: null, selectedBranches: [] }
  }

  const assignmentDocs = await db.branch_assignments.find({
    selector: {
      user_id: employeeId,
      is_active: true,
      _deleted: { $ne: true },
    },
  }).exec()

  const selectedBranches = assignmentDocs.map((doc) => doc.branch_id)

  if (!canViewAll && effectiveBranchId && !selectedBranches.includes(effectiveBranchId)) {
    throw new Error('You do not have access to this employee.')
  }

  return {
    employee,
    selectedBranches,
  }
}

export async function saveEmployeeDetail({ businessId, employeeId, fullName, email, role, isActive, selectedBranches, isOwner, availableBranches }) {
  if (!businessId) throw new Error('Business not loaded')
  if (!employeeId) throw new Error('Employee not loaded')

  await upsertUser({
    id: employeeId,
    business_id: businessId,
    full_name: fullName,
    email,
    role,
    is_active: isActive,
  })

  if (isOwner && availableBranches.length > 0) {
    const db = await getDb()
    const existingAssignments = await db.branch_assignments.find({
      selector: {
        user_id: employeeId,
        _deleted: { $ne: true },
      },
    }).exec()

    const existingByBranch = new Map(existingAssignments.map((doc) => [doc.branch_id, doc]))
    const selectedSet = new Set(selectedBranches)

    await Promise.all(selectedBranches.map(async (branchId) => {
      const assignmentId = `${employeeId}:${branchId}`
      const existing = existingByBranch.get(branchId)
      const payload = {
        id: assignmentId,
        user_id: employeeId,
        branch_id: branchId,
        role,
        is_active: true,
        _modified: Date.now(),
        _deleted: false,
      }

      if (existing) {
        await existing.incrementalPatch(payload)
      } else if (db.branch_assignments && typeof db.branch_assignments.upsert === 'function') {
        await db.branch_assignments.upsert(payload)
      } else {
        const { error } = await supabase
          .from('user_branch_assignments')
          .upsert({ user_id: employeeId, branch_id: branchId, role, is_active: true })

        if (error) throw error
      }
    }))

    await Promise.all(
      existingAssignments
        .filter((doc) => !selectedSet.has(doc.branch_id))
        .map((doc) => doc.incrementalPatch({ _deleted: true, _modified: Date.now() }))
    )
  }
}

export async function deleteEmployeeDetail({ businessId, employeeId }) {
  if (!businessId) throw new Error('Business not loaded')
  if (!employeeId) throw new Error('Employee not loaded')

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Delete request timed out after 30 seconds')), 30000)
  )

  const invokePromise = supabase.functions.invoke('delete-employee', {
    body: {
      userId: employeeId,
      businessId,
    },
  })

  const result = await Promise.race([invokePromise, timeoutPromise])
  const { error } = result

  if (error) {
    let errorMessage = error.message || 'Delete failed'

    if (error.context && typeof error.context.json === 'function') {
      try {
        const body = await error.context.json()
        if (body?.error) {
          errorMessage = body.error
        }
      } catch {
        // Ignore parse failures.
      }
    }

    throw new Error(errorMessage)
  }

  const db = await getDb()
  const assignmentDocs = await db.branch_assignments.find({
    selector: { user_id: employeeId },
  }).exec()

  await Promise.all(
    assignmentDocs.map((doc) =>
      doc.incrementalPatch({
        _deleted: true,
        _modified: Date.now(),
      })
    )
  )
}