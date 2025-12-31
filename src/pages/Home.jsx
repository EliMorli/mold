import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to Dashboard
    navigate(createPageUrl("Dashboard"), { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="clay-card rounded-3xl p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-white text-2xl font-bold">J</span>
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
          JohnMold
        </h1>
        <p className="text-gray-500 mt-2">Loading...</p>
      </div>
    </div>
  );
}
