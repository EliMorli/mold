# Supabase setup

This directory contains the database schema and migrations for the Mold app's
Supabase backend. Migrations are applied in order; each one's filename is
prefixed with a four-digit sequence number.

## One-time project setup

1. **Create the Supabase project** at https://supabase.com → New project. Save
   the database password somewhere safe.
2. In the project dashboard, go to **Settings → API** and copy:
   - `Project URL`
   - `anon public` key
   - `service_role` key (server-side only)
3. Add these to Vercel (Settings → Environment Variables) for **all three**
   environments (Production, Preview, Development):
   - `VITE_SUPABASE_URL` ← Project URL
   - `VITE_SUPABASE_ANON_KEY` ← anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` ← service_role key (no `VITE_` prefix; server only)
4. **Auth → URL Configuration**:
   - Site URL: `https://mold-flax.vercel.app`
   - Redirect URLs (add each): `https://mold-flax.vercel.app/**`,
     `http://localhost:5173/**`
5. **Auth → Providers → Google**: enable, paste your Google OAuth client
   ID/secret, set authorized redirect URI to the value Supabase displays.
   (Skip for now if you don't have Google OAuth credentials yet — the app will
   still work with email/password.)
6. **Auth → Email Templates**: customize "Confirm signup", "Magic link", and
   "Reset password" if you want branded emails. The defaults work.

## Applying migrations

Until we add Supabase CLI tooling, paste each migration into the SQL Editor:

1. Open the project → **SQL Editor → New query**.
2. Paste the entire contents of `migrations/0001_init_auth_orgs.sql`.
3. Click **Run**.
4. Verify in **Database → Tables**: you should see `profiles`, `orgs`,
   `org_members`, and `org_invites`. Each should have RLS **enabled**.

For subsequent migrations, repeat with the next file.

## Schema overview

### Tenancy

- **`orgs`** — one row per customer organization. Owns billing fields
  (`trial_ends_at`, `stripe_customer_id`, `subscription_status`).
- **`org_members`** — join table linking `auth.users` to `orgs` with a `role`
  (`owner`, `admin`, `manager`, `technician`, `viewer`).
- **`org_invites`** — pending invitations. The `token` is the secret in the
  invite link.
- **`profiles`** — extends `auth.users` with `full_name`, `avatar_url`. A
  trigger on `auth.users` insert auto-creates the profile.

### RLS pattern

Every tenant-scoped table will follow this shape:

```sql
alter table public.<entity> enable row level security;

create policy "<entity>: members can read"
  on public.<entity> for select
  using (org_id in (select public.user_orgs()));

create policy "<entity>: members can write"
  on public.<entity> for insert
  with check (org_id in (select public.user_orgs()));

create policy "<entity>: members can update"
  on public.<entity> for update
  using (org_id in (select public.user_orgs()))
  with check (org_id in (select public.user_orgs()));
```

Helper functions:

- `public.user_orgs()` — orgs the calling user is a member of.
- `public.user_org_role(org_id)` — calling user's role in a specific org, or
  `null` if not a member.

## What's next

Future migrations (one phase at a time):

- `0002_*.sql` — Phase 2: app entities (`clients`, `tests`, `invoices`, etc.)
  with `org_id` and RLS.
- `0003_*.sql` — Phase 3: `integrations` table for QuickBooks tokens
  (encrypted at rest).
- `0004_*.sql` — Phase 5: Stripe customer/subscription mirror.
