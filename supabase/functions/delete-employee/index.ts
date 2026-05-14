// supabase/functions/delete-employee/index.ts

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
    // ── 1. Verify caller is authenticated ──
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const callerClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── 2. Verify caller is owner or manager ──
    const { data: callerData, error: callerDataError } = await callerClient
      .from("users")
      .select("role, business_id")
      .eq("id", caller.id)
      .single()

    if (callerDataError || !callerData) {
      return new Response(JSON.stringify({ error: "Could not verify caller identity" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!["owner", "manager"].includes(callerData.role)) {
      return new Response(JSON.stringify({ error: "Only owners and managers can delete employees" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── 3. Parse and validate request body ──
    const { userId, businessId } = await req.json()

    console.log("=== DELETE-EMPLOYEE REQUEST ===")
    console.log({ userId, businessId })
    console.log("Caller:", { id: caller.id, role: callerData.role, business_id: callerData.business_id })
    console.log("==============================")

    // Required fields
    if (!userId || !businessId) {
      return new Response(JSON.stringify({ 
        error: "userId and businessId are required" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Caller must belong to the same business
    if (callerData.business_id !== businessId) {
      return new Response(JSON.stringify({ error: "Invalid business ID" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Can't delete yourself
    if (userId === caller.id) {
      return new Response(JSON.stringify({ error: "You cannot delete your own account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── 4. Admin client for privileged operations ──
    console.log("[1] Creating admin client...")
    const adminClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    console.log("[1] Admin client created")

    // ── 5. Verify the user exists and belongs to this business ──
    console.log("[2] Fetching user to delete...")
    const { data: userData, error: userError } = await adminClient
      .from("users")
      .select("id, email, full_name")
      .eq("id", userId)
      .eq("business_id", businessId)
      .single()

    if (userError || !userData) {
      return new Response(JSON.stringify({ 
        error: "Employee not found in this business" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── 6. Delete branch assignments ──
    console.log("[3] Deleting branch assignments...")
    const { error: assignmentDeleteError } = await adminClient
      .from("user_branch_assignments")
      .delete()
      .eq("user_id", userId)

    if (assignmentDeleteError) {
      console.error("Branch assignment deletion failed:", assignmentDeleteError)
      return new Response(JSON.stringify({ 
        error: "Failed to remove branch assignments" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── 7. Delete from users table ──
    console.log("[4] Deleting from users table...")
    const { error: userDeleteError } = await adminClient
      .from("users")
      .delete()
      .eq("id", userId)
      .eq("business_id", businessId)

    if (userDeleteError) {
      console.error("Users table deletion failed:", userDeleteError)
      return new Response(JSON.stringify({ 
        error: "Failed to delete user profile" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── 8. Delete auth user ──
    console.log("[5] Deleting auth user...")
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error("Auth user deletion failed:", authDeleteError)
      return new Response(JSON.stringify({ 
        error: "Failed to delete auth account" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    console.log(`[6] Employee deleted successfully: ${userData.email}`)

    // ── 9. Return success ──
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${userData.full_name} has been deleted`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )

  } catch (err) {
    console.error("Unexpected error:", err)
    return new Response(JSON.stringify({ 
      error: (err as Error).message || "Internal server error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
