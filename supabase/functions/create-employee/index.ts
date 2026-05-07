// supabase/functions/create-employee/index.ts

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
      return new Response(JSON.stringify({ error: "Only owners and managers can create employees" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── 3. Parse and validate request body ──
    const { email, password, fullName, role, businessId, branchId } = await req.json()

    console.log("=== CREATE-EMPLOYEE REQUEST ===")
    console.log({ email, fullName, role, businessId, branchId })
    console.log("Caller:", { id: caller.id, role: callerData.role, business_id: callerData.business_id })
    console.log("==============================")

    // Required fields
    if (!email || !password || !fullName || !role || !businessId) {
      return new Response(JSON.stringify({ 
        error: "email, password, fullName, role, and businessId are all required" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Role must be valid
    if (!["cashier", "manager"].includes(role)) {
      return new Response(JSON.stringify({ error: "Role must be cashier or manager" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Branch is required for cashiers and managers — no ghost users
    if (!branchId) {
      return new Response(JSON.stringify({ 
        error: "A branch assignment is required when creating a cashier or manager" 
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

    // ── 4. Admin client for privileged operations ──
    const adminClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ── 5. Verify the branch exists and belongs to this business ──
    const { data: branchData, error: branchError } = await adminClient
      .from("branches")
      .select("id, name, is_active")
      .eq("id", branchId)
      .eq("business_id", businessId)
      .single()

    if (branchError || !branchData) {
      return new Response(JSON.stringify({ 
        error: "Branch not found or does not belong to this business" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!branchData.is_active) {
      return new Response(JSON.stringify({ 
        error: `Branch "${branchData.name}" is inactive. Activate it before assigning employees.` 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── 6. Check for duplicate email within this business ──
    const { data: existingUser, error: existingError } = await adminClient
      .from("users")
      .select("id")
      .eq("email", email)
      .eq("business_id", businessId)
      .maybeSingle()

    if (existingError && existingError.code !== "PGRST116") {
      console.error("Error checking for existing user:", existingError)
      return new Response(JSON.stringify({ error: "Failed to validate email uniqueness" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (existingUser) {
      return new Response(JSON.stringify({ 
        error: "This email is already registered in your business" 
      }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── 7. Create the auth user ──
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
        business_id: businessId,
      },
    })

    if (authError || !authData.user) {
      console.error("Auth user creation failed:", authError)
      return new Response(JSON.stringify({ 
        error: authError?.message || "Failed to create user account" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const newUserId = authData.user.id

    // ── 8. Insert into users table ──
    const { error: insertError } = await adminClient.from("users").insert({
      id: newUserId,
      full_name: fullName,
      email,
      role,
      business_id: businessId,
      default_branch_id: branchId,  // always set — never null
      is_active: true,
    })

    if (insertError) {
      console.error("Users table insert failed:", insertError)
      // Roll back auth user
      await adminClient.auth.admin.deleteUser(newUserId)
      return new Response(JSON.stringify({ 
        error: "Failed to create user profile — account creation rolled back" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── 9. Create branch assignment — must succeed or everything rolls back ──
    const { error: assignmentError } = await adminClient.from("user_branch_assignments").insert({
      user_id: newUserId,
      branch_id: branchId,
      role,
      is_active: true,
    })

    if (assignmentError) {
      console.error("Branch assignment failed:", assignmentError)
      // Roll back both the users row and the auth user
      await adminClient.from("users").delete().eq("id", newUserId)
      await adminClient.auth.admin.deleteUser(newUserId)
      return new Response(JSON.stringify({ 
        error: "Failed to assign branch — account creation rolled back" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    console.log(`Employee created successfully: ${email} → ${branchData.name} (${role})`)

    // ── 10. Return success ──
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${fullName} has been added to ${branchData.name}`,
        user: {
          id: newUserId,
          email,
          fullName,
          role,
          branchId,
          branchName: branchData.name,
          isActive: true,
        }
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