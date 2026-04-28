import { useLocation, Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

export default function CheckEmail() {
  const location = useLocation();
  const email = location.state?.email;

  return (
    <div className="max-w-md mx-auto mt-24 p-6 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900">
      <div className="flex items-center gap-2 font-semibold">
        <Mail className="w-5 h-5" />
        Check your inbox
      </div>
      <p className="text-sm mt-2 opacity-80">
        We sent a confirmation link to {email ? <strong>{email}</strong> : 'your email'}. Click it to
        verify your account and continue to onboarding.
      </p>
      <p className="text-xs mt-4 opacity-70">
        Didn't get it? Check spam, or{' '}
        <Link to="/auth/login" className="underline">
          try logging in
        </Link>{' '}
        — we'll resend the verification automatically if your email isn't confirmed yet.
      </p>
    </div>
  );
}
