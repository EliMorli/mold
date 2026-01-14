import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, Mail, Key, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function VerifyPage() {
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [status, setStatus] = useState(null); // null, 'success', 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 0,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
    },
  });

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsVerifying(true);
    setStatus(null);
    setErrorMessage("");

    // Simulate network delay for demo
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find user by email
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      setStatus('error');
      setErrorMessage("No account found with this email address.");
      setIsVerifying(false);
      return;
    }

    if (user.status === 'Verified') {
      setStatus('error');
      setErrorMessage("This account is already verified. You can log in.");
      setIsVerifying(false);
      return;
    }

    if (user.status === 'Suspended') {
      setStatus('error');
      setErrorMessage("This account has been suspended. Please contact an administrator.");
      setIsVerifying(false);
      return;
    }

    if (user.verification_code !== verificationCode) {
      setStatus('error');
      setErrorMessage("Invalid verification code. Please check and try again.");
      setIsVerifying(false);
      return;
    }

    // Success - update user status
    await updateMutation.mutateAsync({
      id: user.id,
      data: {
        status: 'Verified',
        verification_code: null,
        verified_date: new Date().toISOString()
      }
    });

    setStatus('success');
    setIsVerifying(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="clay-card rounded-3xl p-8 max-w-md w-full">
        {status === 'success' ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Account Verified!</h1>
            <p className="text-gray-500 mb-6">
              Your account has been successfully verified. You can now log in with your credentials.
            </p>
            <Button
              onClick={() => window.location.href = '/'}
              className="clay-button rounded-2xl px-8 py-3 font-semibold text-purple-600 hover:scale-105"
            >
              Go to Login
            </Button>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Verify Your Account</h1>
              <p className="text-gray-500">
                Enter your email and the verification code sent to you by the administrator.
              </p>
            </div>

            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="clay-button rounded-2xl border-0 pl-12"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Verification Code</Label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="clay-button rounded-2xl border-0 pl-12 text-center text-xl tracking-widest font-mono"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">Enter the 6-digit code</p>
              </div>

              <Button
                type="submit"
                disabled={isVerifying || verificationCode.length !== 6}
                className="w-full clay-button rounded-2xl px-6 py-4 font-semibold text-purple-600 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                {isVerifying ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  'Verify Account'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Didn't receive a code?{' '}
                <span className="text-purple-600">Contact your administrator</span>
              </p>
            </div>

            {/* Demo hint */}
            <div className="mt-6 bg-yellow-50 rounded-2xl p-4">
              <p className="text-xs text-yellow-700 text-center">
                <strong>Demo Mode:</strong> Try verifying with email <code className="bg-yellow-100 px-1 rounded">newuser@example.com</code> and code <code className="bg-yellow-100 px-1 rounded">847291</code>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
