# Reset Project Data Safely + Redeploy

Use this when you want to start fresh without breaking sign-in.

## What this reset does

- Clears app data tables in `public` schema.
- Keeps `auth.users` accounts unless you explicitly remove them.

## Step 1: Reset app tables

1. Open Supabase Dashboard.
2. Go to SQL Editor.
3. Open and run [supabase/reset_project_data.sql](supabase/reset_project_data.sql).

## Step 2: First sign-in after reset

1. Open your app.
2. Sign in with an existing auth account.
3. The app will auto-bootstrap a starter business/profile if tables are empty.

## Step 3: Redeploy on Vercel

If your latest commit is already pushed to `main`, Vercel auto-deploys.

If needed, force a new deploy:

1. Open Vercel project dashboard.
2. Go to Deployments.
3. Click Redeploy on latest deployment.

## Recommended environment checks

Confirm these are set in Vercel Project Settings > Environment Variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

For edge function invite links, also set in Supabase function secrets:

- `SITE_URL` (your production app URL)

## Optional: Full hard reset including auth users

Only do this if you want all accounts removed as well.

1. Run Step 1 first.
2. In SQL Editor, run:

```sql
delete from auth.users;
```

3. Sign up again from scratch.
