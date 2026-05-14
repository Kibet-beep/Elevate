import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Verify caller role
    const { data: callerData, error: callerDataError } = await callerClient
      .from('users')
      .select('role, business_id')
      .eq('id', caller.id)
      .single()

    if (callerDataError || !callerData) {
      return new Response(JSON.stringify({ error: "Could not verify caller identity" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    if (callerData.role !== 'owner') {
      return new Response(JSON.stringify({ error: 'Only owners can create branches' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const { name, code, address, phone, email, businessId } = await req.json()

    if (!name || !businessId) {
      return new Response(JSON.stringify({ error: 'name and businessId are required' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

    const id = crypto.randomUUID()
    const row = {
      id,
      business_id: businessId,
      name,
      code: code || null,
      address: address || null,
      phone: phone || null,
      email: email || null,
      is_active: true,
      status: 'active',
    }

    const { error: insertError } = await adminClient.from('branches').insert(row)
    if (insertError) {
      console.error('Branch insert failed:', insertError)
      return new Response(JSON.stringify({ error: insertError.message || 'Failed to create branch' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ success: true, branch: row }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (err) {
    console.error('Unexpected error in create-branch:', err)
    return new Response(JSON.stringify({ error: (err as Error).message || 'Internal server error' }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
