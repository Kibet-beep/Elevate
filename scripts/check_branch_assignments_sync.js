import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY env vars before running this script')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
  try {
    console.log('Checking user_branch_assignments...\n')

    // Get total row count
    const { count, error: countErr } = await supabase
      .from('user_branch_assignments')
      .select('*', { count: 'exact', head: true })

    if (countErr) {
      console.error('Could not get row count:', countErr.message)
    } else {
      console.log(`✓ Total rows: ${count}`)
    }

    // Fetch all rows to see what exists
    const { data: allRows, error: allErr } = await supabase
      .from('user_branch_assignments')
      .select('*')

    if (allErr) {
      console.error('Could not fetch rows:', allErr.message || allErr)
    } else {
      if (allRows && allRows.length > 0) {
        console.log(`\n✓ Found ${allRows.length} rows. Sample:`)
        console.log(JSON.stringify(allRows.slice(0, 2), null, 2))
      } else {
        console.log('\n⚠ No rows found in user_branch_assignments table.')
        console.log('   This means replication has nothing to sync yet.')
        console.log('   You may need to create some test data or assignments.')
      }
    }

    console.log('\nDone')
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

run()
