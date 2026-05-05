// Edge function: bootstrap-admin (one-time)
// POST { org_name } with header x-bootstrap-secret matching env BOOTSTRAP_SECRET.
// Refuses to run if any access_codes row already exists. Creates the first org
// + first owner-level access code and returns the code. After running, delete
// the BOOTSTRAP_SECRET env var so the function can never be invoked again.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { generateAccessCode } from '../_shared/code.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BOOTSTRAP_SECRET = Deno.env.get('BOOTSTRAP_SECRET');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  if (!BOOTSTRAP_SECRET) {
    return json({ error: 'bootstrap disabled' }, 403);
  }
  if (req.headers.get('x-bootstrap-secret') !== BOOTSTRAP_SECRET) {
    return json({ error: 'forbidden' }, 403);
  }

  const body = await req.json().catch(() => null);
  if (!body?.org_name) return json({ error: 'org_name is required' }, 400);
  const displayName = body.display_name || 'First admin';

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { count, error: countErr } = await admin
    .from('access_codes')
    .select('id', { count: 'exact', head: true });
  if (countErr) return json({ error: countErr.message }, 500);
  if ((count ?? 0) > 0) return json({ error: 'already bootstrapped' }, 409);

  const code = generateAccessCode();
  const email = `${code.toLowerCase()}@mold.codes`;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: code,
    email_confirm: true,
    user_metadata: { full_name: displayName },
  });
  if (createErr || !created.user) {
    return json({ error: createErr?.message || 'failed to create user' }, 500);
  }
  const userId = created.user.id;

  const { data: org, error: orgErr } = await admin
    .from('orgs')
    .insert({ name: body.org_name, created_by: userId })
    .select()
    .single();
  if (orgErr || !org) {
    await admin.auth.admin.deleteUser(userId);
    return json({ error: orgErr?.message || 'failed to create org' }, 500);
  }

  const { error: omErr } = await admin.from('org_members').insert({
    org_id: org.id,
    user_id: userId,
    role: 'owner',
  });
  if (omErr) {
    await admin.auth.admin.deleteUser(userId);
    return json({ error: omErr.message }, 500);
  }

  const { error: acErr } = await admin.from('access_codes').insert({
    user_id: userId,
    org_id: org.id,
    role: 'owner',
    display_name: displayName,
    code_prefix: code.slice(0, 3),
    created_by: userId,
  });
  if (acErr) {
    await admin.auth.admin.deleteUser(userId);
    return json({ error: acErr.message }, 500);
  }

  return json({ code, org_id: org.id });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
