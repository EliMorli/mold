-- Phase 1c: replace email/password auth with admin-issued access codes.
--
-- Each access code is bound to a single auth.users row. The code itself is
-- the user's password in Supabase Auth (under a synthetic email of
-- {code}@mold.codes), so client login is just supabase.auth.signInWithPassword
-- with no edge function on the hot path. The full code is never stored here —
-- Supabase Auth hashes it as a password. We only keep a 4-char prefix so admins
-- can identify a row in the list view.

-- =============================================================================
-- access_codes: one row per issued code. Deleting the auth user cascades.
-- =============================================================================
create table public.access_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  role text not null check (role in ('owner','admin','manager','technician','viewer')),
  display_name text not null,
  code_prefix text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index access_codes_org_idx on public.access_codes(org_id);
create index access_codes_created_by_idx on public.access_codes(created_by);

-- =============================================================================
-- touch_access_code(): client calls this right after login so admins can see
-- when each code was last used. Runs as security definer so users can update
-- their own row without needing an RLS policy that lets them write arbitrary
-- columns.
-- =============================================================================
create or replace function public.touch_access_code()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.access_codes
    set last_used_at = now()
    where user_id = auth.uid();
end $$;

-- =============================================================================
-- Row Level Security: only owner/admin of the same org can see or manage codes.
-- All inserts/deletes happen via service_role from edge functions; RLS here
-- exists to defend against direct client calls.
-- =============================================================================
alter table public.access_codes enable row level security;

create policy "access_codes: org admins can read"
  on public.access_codes for select
  using (public.user_org_role(org_id) in ('owner','admin'));

create policy "access_codes: org admins can update"
  on public.access_codes for update
  using (public.user_org_role(org_id) in ('owner','admin'))
  with check (public.user_org_role(org_id) in ('owner','admin'));

-- No insert/delete policies — service_role (edge functions) bypasses RLS;
-- direct client writes are denied.
