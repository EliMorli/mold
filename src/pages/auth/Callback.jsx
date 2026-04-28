// OAuth and email-confirmation landing page. Supabase's detectSessionInUrl
// already exchanges the URL fragment for a session before this component
// renders, so we just wait for the auth state to settle and then route the
// user into the app.

import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const { loading, isAuthenticated, hasOrg } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate('/auth/login');
      return;
    }
    const next = params.get('next');
    if (next) {
      navigate(next);
      return;
    }
    // First-time users without an org go to onboarding (Phase 1b).
    navigate(hasOrg ? '/dashboard' : '/onboarding');
  }, [loading, isAuthenticated, hasOrg, navigate, params]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] gap-2 text-gray-500">
      <Loader2 className="w-5 h-5 animate-spin" />
      Signing you in…
    </div>
  );
}
