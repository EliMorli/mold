// Phase 1b will replace this with the real org-creation + payment-method flow.
// For now it's a placeholder so newly signed-up users land on something.

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function Onboarding() {
  const { user, signOut } = useAuth();

  return (
    <div className="max-w-xl mx-auto mt-16 p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Welcome — let's set up your organization</h1>
      <p className="text-sm text-gray-600">
        Hi {user?.user_metadata?.full_name || user?.email}. The org-creation and 5-day-trial setup
        flow is the next thing we'll build (Phase 1b). Once it's in, this page will collect your
        organization name, address, and a payment method (so the trial can auto-convert), then drop
        you into the dashboard.
      </p>
      <p className="text-xs text-gray-500">
        For now you can sign out and try again later.
      </p>
      <Button onClick={signOut} className="rounded-xl">
        Sign out
      </Button>
    </div>
  );
}

// Re-export the loader spinner so any future Suspense boundary can use it
export { Loader2 };
