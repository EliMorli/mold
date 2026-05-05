// Edge function: create-access-code
// POST { org_id, role, display_name }
// Caller must be owner/admin of org_id. Returns { code } once — the full code
// is not stored, only its 4-char prefix.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { generateAccessCode } from '../_shared/code.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const ALLOWED_ROLES = ['admin', 'manager', 'technician', 'viewer'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'missing auth' }, 401);

  // Resolve caller from their JWT using the anon client.
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await callerClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'invalid session' }, 401);
  const callerId = userData.user.id;

  const body = await req.json().catch(() => null);
  if (!body) return json({ error: 'invalid json' }, 400);
  const { org_id, role, display_name } = body;
  if (!org_id || !role || !display_name) {
    return json({ error: 'org_id, role, display_name are required' }, 400);
  }
  if (!ALLOWED_ROLES.includes(role)) {
    return json({ error: `role must be one of ${ALLOWED_ROLES.join(', ')}` }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Authorize: caller must be owner/admin of the target org.
  const { data: membership, error: memErr } = await admin
    .from('org_members')
    .select('role')
    .eq('org_id', org_id)
    .eq('user_id', callerId)
    .maybeSingle();
  if (memErr) return json({ error: memErr.message }, 500);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return json({ error: 'forbidden' }, 403);
  }

  // Generate a code and create the synthetic auth user.
  const code = generateAccessCode();
  const email = `${code.toLowerCase()}@mold.codes`;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: code,
    email_confirm: true,
    user_metadata: { full_name: display_name },
  });
  if (createErr || !created.user) {
    return json({ error: createErr?.message || 'failed to create user' }, 500);
  }
  const newUserId = created.user.id;

  // Insert org membership.
  const { error: omErr } = await admin.from('org_members').insert({
    org_id,
    user_id: newUserId,
    role,
    invited_by: callerId,
  });
  if (omErr) {
    await admin.auth.admin.deleteUser(newUserId);
    return json({ error: omErr.message }, 500);
  }

  // Insert access_codes record.
  const { error: acErr } = await admin.from('access_codes').insert({
    user_id: newUserId,
    org_id,
    role,
    display_name,
    code_prefix: code.slice(0, 4),
    created_by: callerId,
  });
  if (acErr) {
    await admin.auth.admin.deleteUser(newUserId);
    return json({ error: acErr.message }, 500);
  }

  return json({ code });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
