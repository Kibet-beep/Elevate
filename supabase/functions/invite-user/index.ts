// supabase/functions/invite-user/index.ts
//
// SETUP INSTRUCTIONS:
// 1. Install Supabase CLI:  winget install Supabase.CLI
// 2. Login:                 supabase login
// 3. Link your project:     supabase link --project-ref YOUR_PROJECT_REF
// 4. Deploy this function:  supabase functions deploy invite-user
// 5. In Supabase dashboard → Edge Functions → invite-user → add secret:
//      SUPABASE_SERVICE_ROLE_KEY = your service role key (from Project Settings → API)
//
// Your project ref is in your Supabase URL:
// https://YOUR_PROJECT_REF.supabase.co

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:5173"

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

    const { data: callerData, error: callerDataError } = await callerClient
      .from("users")
      .select("role, business_id")
      .eq("id", caller.id)
      .single()

    if (callerDataError || !callerData || !["owner", "manager"].includes(callerData.role)) {
      return new Response(JSON.stringify({ error: "Only owners and managers can invite employees" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { email, fullName, role } = await req.json()

    if (!email || !fullName || !role) {
      return new Response(JSON.stringify({ error: "email, fullName, and role are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!["cashier", "manager"].includes(role)) {
      return new Response(JSON.stringify({ error: "Role must be cashier or manager" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const adminClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    console.log("=== EXISTING USER CHECK DEBUG ===")
    console.log("Email to check:", email)
    console.log("Caller business ID:", callerData.business_id)
    console.log("Caller role:", callerData.role)
    console.log("Caller data:", JSON.stringify(callerData, null, 2))
    console.log("==============================")

    // Check if business_id exists
    if (!callerData.business_id) {
      return new Response(JSON.stringify({ error: "Owner has no business_id assigned. Please complete business setup first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: existingUser, error: existingError } = await adminClient
      .from("users")
      .select("id")
      .eq("email", email)
      .eq("business_id", callerData.business_id)
      .maybeSingle() // Use maybeSingle() instead of single() to handle 0 rows gracefully

    console.log("Existing user query result:", { data: existingUser, error: existingError })

    // Check for actual database errors (not PGRST116 which is handled by maybeSingle)
    if (existingError) {
      console.log("=== EXISTING USER ERROR DEBUG ===")
      console.log("Error details:", JSON.stringify(existingError, null, 2))
      console.log("Error code:", existingError.code)
      console.log("Error message:", existingError.message)
      console.log("================================")
      
      // Fallback: if we can't check for existing users, proceed with creation
      // This is safer than blocking the entire flow
      console.log("Database error checking existing user, proceeding with user creation anyway")
    } else if (existingUser) {
      console.log("Existing user found:", existingUser)
      return new Response(JSON.stringify({ error: "This email has already been invited to your business" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    console.log("No existing user found, proceeding with user creation")

    // Create user directly without email invite (for now)
    const tempPassword = Math.random().toString(36).slice(-8) // Generate random password
    
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        full_name: fullName,
        role,
        business_id: callerData.business_id,
        temp_password: tempPassword, // Store temporary password for display
      },
    })

    if (authError || !authData?.user) {
      console.log("=== USER CREATION ERROR DEBUG ===")
      console.log("Auth error:", JSON.stringify(authError, null, 2))
      console.log("Auth data:", JSON.stringify(authData, null, 2))
      console.log("Email being created:", email)
      console.log("Caller business ID:", callerData.business_id)
      console.log("================================")
      
      let errorMessage = "Unknown error creating user"
      if (authError) {
        if (authError.message?.includes("already registered")) {
          errorMessage = "This email is already registered in the system"
        } else if (authError.message?.includes("rate limit")) {
          errorMessage = "Too many users created. Please wait a few minutes."
        } else {
          errorMessage = authError.message
        }
      }
      
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { error: insertError } = await adminClient.from("users").insert({
      id: authData.user.id,
      full_name: fullName,
      email,
      role,
      business_id: callerData.business_id,
      is_active: true, // Set to true since we're creating directly
    })

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${fullName} created successfully`,
        user: {
          id: authData.user.id,
          email,
          fullName,
          role,
          tempPassword, // Include temp password for display
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})