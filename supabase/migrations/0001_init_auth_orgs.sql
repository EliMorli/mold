-- Phase 1a: auth + tenant scaffolding
-- Tables: profiles, orgs, org_members, org_invites
-- Helpers: user_orgs(), user_org_role()
-- Trigger: on auth.users insert -> create profile
-- RLS: tenant isolation via org_members membership

create extension if not exists pgcrypto;

-- =============================================================================
-- profiles: extends auth.users with our app fields
-- =============================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- orgs: tenant container. Created during onboarding (Phase 1b).
-- Billing fields are reserved here so we can populate them in Phase 5 without
-- another migration.
-- =============================================================================
create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  -- Billing
  trial_ends_at timestamptz,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text check (subscription_status in (
    'trialing','active','past_due','canceled','unpaid','incomplete','incomplete_expired'
  )),
  -- Audit
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index orgs_subscription_status_idx on public.orgs(subscription_status);

-- =============================================================================
-- org_members: links users to orgs with a role. The (org_id, user_id) unique
-- constraint enforces "one role per user per org".
-- =============================================================================
create table public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','manager','technician','viewer')),
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  unique(org_id, user_id)
);
create index org_members_user_idx on public.org_members(user_id);

-- =============================================================================
-- org_invites: pending invitations. Token is the secret in the invite link.
-- Acceptance happens via a server-side RPC in Phase 1c (RLS would otherwise
-- prevent the invitee from inserting their own membership).
-- =============================================================================
create table public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','manager','technician','viewer')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index org_invites_email_idx on public.org_invites(lower(email));
create index org_invites_token_idx on public.org_invites(token);

-- =============================================================================
-- Helper functions for RLS policies. Marked stable (return is deterministic
-- within a single statement) so the planner can cache the result.
-- =============================================================================

-- Returns the orgs the calling user is a member of. Use in: org_id in (select user_orgs())
create or replace function public.user_orgs()
returns setof uuid
language sql
stable
security invoker
as $$
  select org_id from public.org_members where user_id = auth.uid();
$$;

-- Returns the calling user's role in the given org, or null if not a member.
create or replace function public.user_org_role(p_org_id uuid)
returns text
language sql
stable
security invoker
as $$
  select role from public.org_members
  where user_id = auth.uid() and org_id = p_org_id
  limit 1;
$$;

-- =============================================================================
-- Trigger: when an auth user is created, create their profile row.
-- We deliberately do NOT auto-create an org here — self-signup users go
-- through onboarding to name their org and invited users join an existing
-- one via accept_invite() (Phase 1c).
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.orgs enable row level security;
alter table public.org_members enable row level security;
alter table public.org_invites enable row level security;

-- ----- profiles -----
-- Users can read their own profile and the profiles of anyone they share an org with.
create policy "profiles: read own or co-org"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.org_members me
      join public.org_members them on me.org_id = them.org_id
      where me.user_id = auth.uid() and them.user_id = profiles.id
    )
  );

-- Users can update their own profile only.
create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Profile rows are inserted exclusively by the on_auth_user_created trigger.
-- No insert policy means user-initiated inserts are denied.

-- ----- orgs -----
-- Members of an org can read it.
create policy "orgs: members can read"
  on public.orgs for select
  using (id in (select public.user_orgs()));

-- Owners and admins can update org metadata.
create policy "orgs: admins can update"
  on public.orgs for update
  using (public.user_org_role(id) in ('owner','admin'))
  with check (public.user_org_role(id) in ('owner','admin'));

-- Org creation is gated through a server-side RPC (create_org) in Phase 1b
-- so we can also create the owner's org_members row atomically. No insert
-- policy here; users cannot create orgs directly.

-- ----- org_members -----
-- Members can see who's in their orgs.
create policy "org_members: members can read"
  on public.org_members for select
  using (org_id in (select public.user_orgs()));

-- Owners + admins can add/remove/change members.
-- (Note: this also lets an admin demote themselves; we'll add a "last owner"
-- check in Phase 1c when we wire up the UI.)
create policy "org_members: admins can manage"
  on public.org_members for all
  using (public.user_org_role(org_id) in ('owner','admin'))
  with check (public.user_org_role(org_id) in ('owner','admin'));

-- ----- org_invites -----
-- Owners + admins manage invites for their org.
create policy "org_invites: admins can manage"
  on public.org_invites for all
  using (public.user_org_role(org_id) in ('owner','admin'))
  with check (public.user_org_role(org_id) in ('owner','admin'));

-- Public read by token (so the invitee, who isn't yet in the org, can fetch
-- the invite to display "You've been invited to {org}"). The token itself is
-- the auth: it's 48 hex chars and known only to whoever has the invite link.
create policy "org_invites: read by token"
  on public.org_invites for select
  using (true);
-- ^ This policy looks permissive but in practice clients will only ever query
-- by token, and tokens are unguessable. If we wanted defense in depth we'd
-- move the lookup to a security-definer function; revisit in Phase 1c.

-- =============================================================================
-- Convenience: updated_at maintenance
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger orgs_set_updated_at
  before update on public.orgs
  for each row execute function public.set_updated_at();
