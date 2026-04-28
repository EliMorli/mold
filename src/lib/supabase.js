// Browser-side Supabase client. Uses the anon key, which is safe to expose;
// row level security on the database is what enforces data isolation.
//
// Server-side code should use src/lib/supabaseAdmin.js instead — that one
// uses the service_role key and bypasses RLS, so it must never be imported
// from any file that gets bundled to the browser.

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // We log instead of throw so the app still loads (e.g. on a stale preview
  // deploy without the env vars yet). Auth-gated pages will surface a clear
  // "Supabase isn't configured" message to the user.
  // eslint-disable-next-line no-console
  console.warn(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. ' +
    'Set both in your Vercel project env vars (or .env.local for dev).'
  );
}

export const supabase = createClient(url || 'http://invalid', anonKey || 'invalid', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

export const isSupabaseConfigured = () => Boolean(url && anonKey);
