import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="max-w-md mx-auto mt-24 p-6 rounded-2xl bg-emerald-50 border border-emerald-200">
        <div className="flex items-center gap-2 text-emerald-700 font-semibold">
          <CheckCircle className="w-5 h-5" />
          Check your email
        </div>
        <p className="text-sm text-emerald-700 opacity-80 mt-2">
          If an account exists for <strong>{email}</strong>, we sent a reset link to it. Open the email
          and follow the link to set a new password.
        </p>
        <Link to="/auth/login" className="text-sm text-emerald-700 underline mt-4 inline-block">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Reset your password</h1>
      <p className="text-sm text-gray-500 mb-6">
        Enter the email address you used to sign up. We'll send you a link to set a new password.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-gray-600 mb-1.5 block">Email</label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              required
              className="rounded-xl h-11 pl-10"
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl h-11 font-semibold disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send reset link'}
        </Button>
      </form>
      <p className="text-sm text-gray-500 mt-6 text-center">
        Remembered it?{' '}
        <Link to="/auth/login" className="text-green-600 font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
