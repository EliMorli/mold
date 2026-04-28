import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, AlertTriangle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

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
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const next = new URLSearchParams(location.search).get('next') || '/dashboard';
    navigate(next);
  };

  const onGoogle = async () => {
    setSubmitting(true);
    const next = new URLSearchParams(location.search).get('next') || '/dashboard';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Welcome back</h1>
      <p className="text-sm text-gray-500 mb-6">Log in to your account.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-gray-600 mb-1.5 block">Email</label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value.trim() }))}
              placeholder="you@company.com"
              required
              className="rounded-xl h-11 pl-10"
            />
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1.5 block">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
              className="rounded-xl h-11 pl-10"
            />
          </div>
          <div className="text-right mt-1.5">
            <Link to="/auth/forgot-password" className="text-xs text-gray-500 hover:text-gray-700">
              Forgot password?
            </Link>
          </div>
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl h-11 font-semibold disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log in'}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
        <div className="flex-1 border-t border-gray-200" /> or <div className="flex-1 border-t border-gray-200" />
      </div>

      <Button
        onClick={onGoogle}
        disabled={submitting}
        className="w-full rounded-xl h-11 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium"
      >
        Continue with Google
      </Button>

      <p className="text-sm text-gray-500 mt-6 text-center">
        New here?{' '}
        <Link to="/auth/signup" className="text-green-600 font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
