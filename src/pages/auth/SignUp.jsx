import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User as UserIcon, AlertTriangle } from 'lucide-react';

export default function SignUp() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });

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
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: { full_name: form.fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate('/auth/check-email', { state: { email: form.email.trim() } });
  };

  const onGoogle = async () => {
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
    }
    // On success, browser is redirected away.
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Create your account</h1>
      <p className="text-sm text-gray-500 mb-6">5-day free trial, no card required to start.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-gray-600 mb-1.5 block">Full name</label>
          <div className="relative">
            <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
              placeholder="Jane Smith"
              required
              className="rounded-xl h-11 pl-10"
            />
          </div>
        </div>
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
              placeholder="At least 8 characters"
              required
              minLength={8}
              className="rounded-xl h-11 pl-10"
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl h-11 font-semibold disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create account'}
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
        Already have an account?{' '}
        <Link to="/auth/login" className="text-green-600 font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
