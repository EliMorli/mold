import { useMemo, useState } from 'react';
import { CheckCircle, XCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VerifyPage() {
  const [status, setStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const googleAuthUrl = useMemo(
    () => import.meta.env.VITE_GOOGLE_AUTH_URL || '',
    [],
  );

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setStatus(null);
    setErrorMessage('');

    if (!googleAuthUrl) {
      setStatus('error');
      setErrorMessage('Google OAuth URL is not configured. Set VITE_GOOGLE_AUTH_URL.');
      setIsLoading(false);
      return;
    }

    setStatus('success');
    window.location.assign(googleAuthUrl);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="clay-card rounded-3xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Sign in with Google</h1>
          <p className="text-gray-500">
            Access is limited to administrator-created accounts. If your Google account is not provisioned, contact your administrator.
          </p>
        </div>

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">Redirecting to Google sign-in...</p>
          </div>
        )}

        <Button
          type="button"
          disabled={isLoading}
          onClick={handleGoogleSignIn}
          className="w-full clay-button rounded-2xl px-6 py-4 font-semibold text-purple-600 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Connecting to Google...
            </span>
          ) : (
            'Continue with Google'
          )}
        </Button>
      </div>
    </div>
  );
}
