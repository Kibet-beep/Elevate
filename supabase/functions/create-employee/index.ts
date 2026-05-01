// supabase/functions/create-employee/index.ts
//
// SETUP INSTRUCTIONS:
// 1. Install Supabase CLI:  winget install Supabase.CLI
// 2. Login:                 supabase login
// 3. Link your project:     supabase link --project-ref YOUR_PROJECT_REF
// 4. Deploy this function:  supabase functions deploy create-employee
// 5. In Supabase dashboard → Edge Functions → create-employee → add secret:
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
      return new Response(JSON.stringify({ error: "Only owners and managers can create employees" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { email, password, fullName, role, businessId } = await req.json()

    console.log("=== CREATE-EMPLOYEE REQUEST DEBUG ===")
    console.log("Request body:", { email, password, fullName, role, businessId })
    console.log("Caller data:", callerData)
    console.log("Caller business_id:", callerData.business_id)
    console.log("Business ID match:", callerData.business_id === businessId)
    console.log("=====================================")

    if (!email || !password || !fullName || !role || !businessId) {
      console.log("Missing required fields:", { email: !!email, password: !!password, fullName: !!fullName, role: !!role, businessId: !!businessId })
      return new Response(JSON.stringify({ error: "email, password, fullName, role, and businessId are required" }), {
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

    if (callerData.business_id !== businessId) {
      return new Response(JSON.stringify({ error: "Invalid business ID" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const adminClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: existingUser, error: existingError } = await adminClient
      .from("users")
      .select("id")
      .eq("email", email)
      .eq("business_id", callerData.business_id)
      .maybeSingle() // Use maybeSingle() to handle 0 rows gracefully

    if (existingError && existingError.code !== "PGRST116") {
      console.log("Database error checking existing user:", existingError)
      // Fallback: if we can't check for existing users, proceed with creation
      console.log("Database error checking existing user, proceeding with user creation anyway")
    } else if (existingUser) {
      return new Response(JSON.stringify({ error: "This email is already registered in your business" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    console.log("No existing user found, proceeding with user creation")

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
        business_id: callerData.business_id,
      },
    })

    if (authError || !authData.user) {
      console.log("Auth error:", JSON.stringify(authError))
      return new Response(JSON.stringify({ error: authError?.message || "Failed to create user account" }), {
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
      is_active: true,
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
        message: `Employee account created for ${email}`,
        user: {
          id: authData.user.id,
          email,
          fullName,
          role,
          isActive: true
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
