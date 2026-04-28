// Gates rendering of a route on authentication state. Redirects unauthenticated
// users to /auth/login, unverified emails to /auth/check-email, and
// users-without-an-org to /onboarding. Anything past those gates lands on the
// requested page.

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, requireOrg = true }) {
  const { loading, isAuthenticated, isEmailVerified, hasOrg } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] gap-2 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth/login?next=${next}`} replace />;
  }

  // Email verification only applies to email/password sign-ups; OAuth users
  // (Google etc.) come back already verified.
  if (!isEmailVerified) {
    return <Navigate to="/auth/check-email" replace />;
  }

  if (requireOrg && !hasOrg) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
