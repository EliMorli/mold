-- Phase 1c fix: stop RLS infinite recursion on org_members / orgs.
--
-- The original 0001 migration declared user_orgs() and user_org_role() as
-- security invoker, so when the org_members SELECT policy calls user_orgs(),
-- the function's own select against org_members re-triggers the policy,
-- which calls user_orgs() again — infinite loop, terminated by Postgres
-- with "stack depth limit exceeded" (SQLSTATE 54001) on first read.
--
-- Switching them to security definer makes the helper bypass RLS when
-- evaluating membership, breaking the cycle. The functions still gate on
-- auth.uid() so they only ever return rows for the calling user.

create or replace function public.user_orgs()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.org_members where user_id = auth.uid();
$$;

create or replace function public.user_org_role(p_org_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.org_members
  where user_id = auth.uid() and org_id = p_org_id
  limit 1;
$$;
