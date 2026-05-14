Deploy instructions for the create-branch edge function

1. From your supabase project, open the Edge Functions UI.
2. Create a new function `create-branch` and paste the contents of `index.ts`.
3. Set environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Deploy the function.

Usage (client):
- Call with `supabase.functions.invoke('create-branch', { body: { name, code, address, phone, email, businessId } })`
- Caller must be authenticated and role `owner`. The function uses the caller's JWT for verification.

Notes:
- This function provides a privileged server-side upsert for branch creation when RLS blocks client upserts.
- Prefer applying correct RLS policies; this function is a fallback for blocked clients.