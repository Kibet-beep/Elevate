import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
  try {
    console.log('Setting up test data...\n')

    // Get owner user
    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'owner')
      .limit(1)

    if (usersErr || !users || users.length === 0) {
      console.error('Could not find owner user')
      return
    }

    const ownerId = users[0].id
    console.log(`Found owner: ${ownerId}`)

    // Get a business id (we'll use the owner's default business or create one)
    const { data: businesses, error: bizErr } = await supabase
      .from('businesses')
      .select('id')
      .limit(1)

    if (bizErr || !businesses || businesses.length === 0) {
      console.error('Could not find business')
      return
    }

    const businessId = businesses[0].id
    console.log(`Found business: ${businessId}`)

    // Create 2 test branches
    const branchesToCreate = [
      { name: 'Main Branch', business_id: businessId, is_active: true, status: 'active' },
      { name: 'Secondary Branch', business_id: businessId, is_active: true, status: 'active' },
    ]

    console.log('\nCreating test branches...')
    const { data: createdBranches, error: branchErr } = await supabase
      .from('branches')
      .insert(branchesToCreate)
      .select('id, name')

    if (branchErr) {
      console.error('Error creating branches:', branchErr.message)
      return
    }

    console.log(`✓ Created ${createdBranches?.length} branches:`)
    createdBranches?.forEach(b => console.log(`  - ${b.name} (id: ${b.id})`))

    // Now create assignments for all users to the first branch
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, email')

    if (!allUsers || allUsers.length === 0) {
      console.log('No users found')
      return
    }

    const firstBranchId = createdBranches[0].id
    const assignmentsToCreate = allUsers.map(u => ({
      user_id: u.id,
      branch_id: firstBranchId,
      role: u.email.includes('owner') ? 'manager' : 'cashier',
      is_active: true,
    }))

    console.log(`\nCreating ${assignmentsToCreate.length} test assignments...`)
    const { data: createdAssignments, error: assignErr } = await supabase
      .from('user_branch_assignments')
      .insert(assignmentsToCreate)
      .select()

    if (assignErr) {
      console.error('Error creating assignments:', assignErr.message)
      return
    }

    console.log(`✓ Created ${createdAssignments?.length} assignments`)

    // Verify
    const { data: finalAssignments } = await supabase
      .from('user_branch_assignments')
      .select('*')

    console.log(`\n✓ Total assignments in DB: ${finalAssignments?.length ?? 0}`)

    console.log('\nDone! Your data is ready.')
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

run()
