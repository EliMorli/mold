import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, KeyRound, AlertTriangle } from 'lucide-react';

const CODE_PATTERN = /^[A-Z2-9]{3}-[A-Z2-9]{3}-[A-Z2-9]{3}-[A-Z2-9]{3}$/;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState('');

  if (!isSupabaseConfigured()) {
    return (
      <div className="max-w-md mx-auto mt-24 p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-5 h-5" />
          Authentication is not configured
        </div>
        <p className="text-sm mt-2 opacity-80">
          The site administrator needs to set <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> in the Vercel project, then redeploy.
        </p>
      </div>
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!CODE_PATTERN.test(normalized)) {
      toast.error('Access codes look like ABC-DEF-GHJ-KMN');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: `${normalized.toLowerCase()}@mold.codes`,
      password: normalized,
    });
    if (error) {
      setSubmitting(false);
      toast.error('Invalid access code');
      return;
    }
    // Best-effort touch — don't block login if it fails. supabase.rpc()
    // returns a thenable (not a real Promise), so use .then(_, onError)
    // rather than .catch(), which isn't defined on the builder.
    supabase.rpc('touch_access_code').then(() => {}, () => {});
    setSubmitting(false);
    const next = new URLSearchParams(location.search).get('next') || '/dashboard';
    navigate(next);
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Sign in</h1>
      <p className="text-sm text-gray-500 mb-6">
        Enter the access code your administrator gave you.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-gray-600 mb-1.5 block">Access code</label>
          <div className="relative">
            <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC-DEF-GHJ-KMN"
              required
              className="rounded-xl h-11 pl-10 font-mono tracking-widest"
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl h-11 font-semibold disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign in'}
        </Button>
      </form>

      <p className="text-xs text-gray-500 mt-6 text-center">
        Lost your code? Ask an administrator to issue a new one.
      </p>
    </div>
  );
}
