// src/services/branchEmployeesService.js
import { getDb } from '../lib/db'
import { supabase } from '../lib/supabase'
import { getUsersByBusiness, upsertUser } from '../repositories/usersRepository'

function toPlain(doc) {
  return typeof doc?.toJSON === 'function' ? doc.toJSON() : doc
}

function getErrorMessage(error, fallback) {
  return error?.message || fallback
}

export async function loadBranchEmployees({ businessId, branchIds }) {
  if (!businessId || !Array.isArray(branchIds) || branchIds.length === 0) {
    return []
  }

  const db = await getDb()
  const [assignmentDocs, userDocs] = await Promise.all([
    db.branch_assignments
      .find({
        selector: {
          branch_id: { $in: branchIds },
          _deleted: { $ne: true },
        },
      })
      .exec(),
    getUsersByBusiness(businessId),
  ])

  const usersById = new Map((userDocs || []).map((user) => {
    const plain = toPlain(user)
    return [plain.id, plain]
  }))

  const employeesById = new Map()

  for (const assignmentDoc of assignmentDocs) {
    const assignment = toPlain(assignmentDoc)
    const user = usersById.get(assignment.user_id) || {}
    const existing = employeesById.get(assignment.user_id) || {
      id: assignment.user_id,
      full_name: user.full_name || 'Unknown',
      email: user.email || '',
      role: user.role || assignment.role || 'cashier',
      is_active: user.is_active ?? assignment.is_active ?? true,
      branch_ids: [],
      business_id: businessId,
      default_branch_id: null,
    }

    existing.full_name = user.full_name || existing.full_name
    existing.email = user.email || existing.email
    existing.role = user.role || assignment.role || existing.role
    existing.is_active = user.is_active ?? assignment.is_active ?? existing.is_active
    existing.branch_ids = Array.from(new Set([...existing.branch_ids, assignment.branch_id]))
    existing.default_branch_id = existing.default_branch_id || assignment.branch_id || null
    employeesById.set(assignment.user_id, existing)
  }

  return Array.from(employeesById.values()).sort((a, b) => {
    const left = (a.full_name || a.email || '').toLowerCase()
    const right = (b.full_name || b.email || '').toLowerCase()
    return left.localeCompare(right)
  })
}

export async function addBranchEmployee({ businessId, branchId, fullName, email, password, role }) {
  if (!businessId) throw new Error('Business ID not loaded. Please refresh the page.')
  if (!branchId) throw new Error('Select a branch before adding the employee')

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
  if (!isOnline) {
    throw new Error('You are offline. Adding employees requires internet connection because account creation happens on Supabase.')
  }

  const { data: serverBranches, error: serverBranchesError } = await supabase
    .from('branches')
    .select('id, name, is_active')
    .eq('business_id', businessId)
    .eq('is_active', true)

  if (serverBranchesError) {
    throw new Error(getErrorMessage(serverBranchesError, 'Failed to verify branches on server'))
  }

  const activeServerBranches = serverBranches || []
  if (activeServerBranches.length === 0) {
    throw new Error('No active branches found on server for this business')
  }

  const selectedServerBranch = activeServerBranches.find((branch) => branch.id === branchId)
  const serverBranchToUse = selectedServerBranch || activeServerBranches[0]

  if (!selectedServerBranch) {
    console.warn('Local branch not found on server, falling back to first active server branch', {
      localCandidateBranchId: branchId,
      fallbackBranchId: serverBranchToUse.id,
    })
  }

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Edge function request timed out after 30 seconds')), 30000)
  )

  const invokePromise = supabase.functions.invoke('create-employee', {
    body: {
      email: email.trim().toLowerCase(),
      password,
      fullName: fullName.trim(),
      role,
      businessId,
      branchId: serverBranchToUse.id,
    },
  })

  const result = await Promise.race([invokePromise, timeoutPromise])
  const { data, error } = result

  if (error) {
    let errorMessage = getErrorMessage(error, 'Edge function failed')

    if (error.context && typeof error.context.json === 'function') {
      try {
        const responseBody = await error.context.json()
        if (responseBody?.error) {
          errorMessage = responseBody.error
        }
      } catch {
        // Ignore response parsing issues here.
      }
    }

    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('fetch')) {
      throw new Error('Network error: Could not reach the server. Please check your internet connection.')
    }

    if (errorMessage.includes('Branch not found or does not belong to this business')) {
      throw new Error('The selected branch is not linked to your current business on the server. Open branch selector, reselect a branch, then try again.')
    }

    throw new Error(errorMessage)
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  const db = await getDb()
  await db.branch_assignments.upsert({
    id: `${data.user.id}:${data.user.branchId}`,
    user_id: data.user.id,
    branch_id: data.user.branchId,
    role: data.user.role,
    is_active: true,
    _modified: Date.now(),
    _deleted: false,
  })

  return data
}

export async function toggleBranchEmployeeActive({ businessId, employeeId, nextActive }) {
  if (!businessId) throw new Error('Business ID not loaded')
  if (!employeeId) throw new Error('Employee ID not loaded')

  await upsertUser({
    id: employeeId,
    business_id: businessId,
    is_active: nextActive,
  })

  const db = await getDb()
  const assignmentDocs = await db.branch_assignments.find({
    selector: {
      user_id: employeeId,
      _deleted: { $ne: true },
    },
  }).exec()

  if (assignmentDocs.length > 0) {
    await Promise.all(
      assignmentDocs.map((doc) =>
        doc.incrementalPatch({
          is_active: nextActive,
          _modified: Date.now(),
        })
      )
    )
    return
  }

  const { error } = await supabase
    .from('user_branch_assignments')
    .update({ is_active: nextActive })
    .eq('user_id', employeeId)

  if (error) throw error
}

export async function deleteBranchEmployee({ businessId, employeeId }) {
  if (!businessId) throw new Error('Business ID not loaded')
  if (!employeeId) throw new Error('Employee ID not loaded')

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
    let errorMessage = getErrorMessage(error, 'Delete failed')

    if (error.context && typeof error.context.json === 'function') {
      try {
        const responseBody = await error.context.json()
        if (responseBody?.error) {
          errorMessage = responseBody.error
        }
      } catch {
        // Ignore response parsing issues here.
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
