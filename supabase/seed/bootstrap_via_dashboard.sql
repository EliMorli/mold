-- Bootstrap path B: wire an already-created auth user into an org as owner.
--
-- Use this when you've created the first user via the Supabase Dashboard
-- (Authentication → Users → Add user, with Auto Confirm User ON). The
-- dashboard creates auth.users + auth.identities the same way GoTrue's
-- signup endpoint does, which avoids the fragility of inserting into
-- auth.users by hand. This script then creates the org, the owner-level
-- org_members row, and the access_codes row pointing at that user.
--
-- 1. Edit the four values below.
-- 2. Paste into the Supabase SQL editor and Run.
-- 3. Sign in with the code at /auth/login.

do $$
declare
  v_email        text := 'abc-def-ghj-kmn@mold.codes';   -- CHANGE ME
  v_code         text := 'ABC-DEF-GHJ-KMN';              -- CHANGE ME — must match the password you set in the dashboard
  v_org_name     text := 'My Company';                   -- CHANGE ME
  v_display_name text := 'First admin';
  v_user_id      uuid;
  v_org_id       uuid;
begin
  select id into v_user_id from auth.users where email = v_email;
  if v_user_id is null then
    raise exception 'No auth.users row with email %. Create one in the dashboard first.', v_email;
  end if;

  insert into public.orgs (name, created_by)
  values (v_org_name, v_user_id)
  returning id into v_org_id;

  insert into public.org_members (org_id, user_id, role)
  values (v_org_id, v_user_id, 'owner');

  insert into public.access_codes (
    user_id, org_id, role, display_name, code_prefix, created_by
  )
  values (
    v_user_id, v_org_id, 'owner', v_display_name, substr(v_code, 1, 3), v_user_id
  );

  raise notice 'Wired up. Sign in with code: %', v_code;
end $$;
