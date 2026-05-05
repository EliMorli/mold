// Edge function: revoke-access-code
// POST { access_code_id }
// Deletes the underlying auth user (which cascades to access_codes /
// org_members / profiles). Caller must be owner/admin of the code's org.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'missing auth' }, 401);

  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await callerClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'invalid session' }, 401);
  const callerId = userData.user.id;

  const body = await req.json().catch(() => null);
  if (!body?.access_code_id) return json({ error: 'access_code_id is required' }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: row, error: rowErr } = await admin
    .from('access_codes')
    .select('id, user_id, org_id')
    .eq('id', body.access_code_id)
    .maybeSingle();
  if (rowErr) return json({ error: rowErr.message }, 500);
  if (!row) return json({ error: 'not found' }, 404);

  // Authorize: caller must be owner/admin of the same org.
  const { data: membership } = await admin
    .from('org_members')
    .select('role')
    .eq('org_id', row.org_id)
    .eq('user_id', callerId)
    .maybeSingle();
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return json({ error: 'forbidden' }, 403);
  }
  // Don't let an admin revoke themselves; would lock them out.
  if (row.user_id === callerId) {
    return json({ error: 'cannot revoke your own access code' }, 400);
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(row.user_id);
  if (delErr) return json({ error: delErr.message }, 500);

  return json({ ok: true });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
