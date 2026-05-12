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
    console.log('Checking for users and branches...\n')

    // Get sample users
    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(5)

    if (usersErr) {
      console.error('Error fetching users:', usersErr.message)
      return
    }

    console.log(`Found ${users?.length ?? 0} users:`)
    users?.forEach(u => console.log(`  - ${u.email} (${u.role})`))

    // Get sample branches
    const { data: branches, error: branchesErr } = await supabase
      .from('branches')
      .select('id, name')
      .limit(5)

    if (branchesErr) {
      console.error('Error fetching branches:', branchesErr.message)
      return
    }

    console.log(`\nFound ${branches?.length ?? 0} branches:`)
    branches?.forEach(b => console.log(`  - ${b.name} (id: ${b.id})`))

    // Try to create a test assignment if we have both users and branches
    if (users && users.length > 0 && branches && branches.length > 0) {
      console.log('\nAttempting to create test assignment...')
      
      const testAssignment = {
        user_id: users[0].id,
        branch_id: branches[0].id,
        role: 'manager',
        is_active: true,
      }

      const { data: created, error: createErr } = await supabase
        .from('user_branch_assignments')
        .insert([testAssignment])
        .select()

      if (createErr) {
        console.error('Error creating assignment:', createErr.message)
      } else {
        console.log('✓ Test assignment created:', created)
      }
    }

    console.log('\nDone')
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

run()
