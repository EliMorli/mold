-- One-shot bootstrap: creates the first owner-level access code so you can
-- log in. Paste this whole block into the Supabase SQL editor and click Run.
--
-- 1. Edit the two values below (v_code, v_org_name).
-- 2. Run.
-- 3. Open the app and sign in with the code (uppercase, with dashes).
--
-- Constraints on v_code:
--   - Format XXX-XXX-XXX-XXX (12 chars + 3 dashes)
--   - Alphabet: A-Z minus I/L/O, plus 2-9 (matches the login regex)
--
-- After you've signed in once, you can issue more codes from
-- /settings/access-codes inside the app.

do $$
declare
  v_code         text := 'ABC-DEF-GHJ-KMN';   -- CHANGE ME
  v_org_name     text := 'My Company';        -- CHANGE ME
  v_display_name text := 'First admin';
  v_email        text;
  v_user_id      uuid := gen_random_uuid();
  v_org_id       uuid;
begin
  if v_code !~ '^[A-Z2-9]{3}-[A-Z2-9]{3}-[A-Z2-9]{3}-[A-Z2-9]{3}$' then
    raise exception 'v_code must match XXX-XXX-XXX-XXX (alphabet A-Z minus I/L/O, plus 2-9)';
  end if;

  v_email := lower(v_code) || '@mold.codes';

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_code, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', v_display_name),
    now(), now(),
    '', '', '', ''
  );

  -- profiles row is created by the on_auth_user_created trigger.

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

  raise notice 'Bootstrap complete. Sign in with code: %', v_code;
end $$;
