import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Password updated. You are now logged in.');
    navigate('/dashboard');
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Set a new password</h1>
      <p className="text-sm text-gray-500 mb-6">Pick something at least 8 characters.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-gray-600 mb-1.5 block">New password</label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="rounded-xl h-11 pl-10"
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl h-11 font-semibold disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update password'}
        </Button>
      </form>
    </div>
  );
}
