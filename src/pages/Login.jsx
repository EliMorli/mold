import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Lock, User, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await base44.auth.login(username, password);
      if (result.success) {
        navigate("/");
        window.location.reload(); // Refresh to update auth state
      } else {
        setError(result.error || "Invalid username or password");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3FF] via-[#F0F9FF] to-[#FFF7ED] flex items-center justify-center p-4">
      <style>{`
        .clay-card {
          background: linear-gradient(145deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7));
          box-shadow:
            8px 8px 20px rgba(139, 92, 246, 0.08),
            -8px -8px 20px rgba(255, 255, 255, 0.9),
            inset 2px 2px 4px rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(10px);
        }

        .clay-input {
          background: linear-gradient(145deg, rgba(255,255,255,0.95), rgba(255,255,255,0.8));
          box-shadow:
            inset 4px 4px 8px rgba(139, 92, 246, 0.05),
            inset -4px -4px 8px rgba(255, 255, 255, 0.5);
        }

        .clay-button {
          background: linear-gradient(145deg, rgba(139, 92, 246, 0.9), rgba(124, 58, 237, 0.9));
          box-shadow:
            6px 6px 12px rgba(139, 92, 246, 0.2),
            -6px -6px 12px rgba(255, 255, 255, 0.9);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .clay-button:hover {
          transform: translateY(-2px);
          box-shadow:
            8px 8px 16px rgba(139, 92, 246, 0.25),
            -8px -8px 16px rgba(255, 255, 255, 1);
        }

        .clay-button:active {
          transform: translateY(0);
          box-shadow:
            inset 4px 4px 8px rgba(0, 0, 0, 0.1),
            inset -4px -4px 8px rgba(255, 255, 255, 0.1);
        }
      `}</style>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="clay-card rounded-3xl p-6 inline-block">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
              JohnMold
            </h1>
          </div>
        </div>

        {/* Login Form */}
        <div className="clay-card rounded-3xl p-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6 text-center">
            Sign In
          </h2>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="clay-input w-full pl-12 pr-4 py-3 rounded-2xl border-0 focus:ring-2 focus:ring-purple-400 outline-none text-gray-700"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="clay-input w-full pl-12 pr-12 py-3 rounded-2xl border-0 focus:ring-2 focus:ring-purple-400 outline-none text-gray-700"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="clay-button w-full py-3 rounded-2xl text-white font-semibold disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-center text-sm text-gray-500">
              Contact your administrator for login credentials
            </p>
          </div>
        </div>

        {/* Demo Credentials Hint */}
        <div className="mt-6 clay-card rounded-2xl p-4">
          <p className="text-xs text-gray-500 text-center mb-2">Demo Credentials:</p>
          <div className="flex justify-center gap-6 text-xs text-gray-600">
            <div>
              <span className="font-medium">Admin:</span> admin / admin123
            </div>
            <div>
              <span className="font-medium">Tech:</span> tech1 / tech123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
