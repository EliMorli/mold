
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import GlobalSearch from "@/components/GlobalSearch";
import { PWAInstallBanner, OfflineIndicator } from "@/components/pwa/PWAInstallBanner";
import {
  LayoutDashboard,
  FlaskConical,
  Users,
  Wrench,
  Receipt,
  Wallet,
  Calendar,
  Settings,
  Menu,
  X,
  MapIcon,
  LogOut,
  MessageSquare,
  Search,
  Target
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/useAuth";

const allNavigationItems = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard, access: "dashboard" },
  { title: "Lead Tracking", url: createPageUrl("LeadTracking"), icon: Target, access: "clients" },
  { title: "Jobs", url: createPageUrl("Tests"), icon: FlaskConical, access: "tests" },
  { title: "Clients", url: createPageUrl("Clients"), icon: Users, access: "clients" },
  { title: "Technicians", url: createPageUrl("Technicians"), icon: Wrench, access: "technicians" },
  { title: "Invoices", url: createPageUrl("Invoices"), icon: Receipt, access: "invoices" },
  { title: "Payments", url: createPageUrl("Payments"), icon: Receipt, access: "payments" },
  { title: "Expenses", url: createPageUrl("Expenses"), icon: Wallet, access: "expenses" },
  { title: "Calendar", url: createPageUrl("Calendar"), icon: Calendar, access: "calendar" },
  { title: "Map", url: createPageUrl("Map"), icon: MapIcon, access: "map" },
  { title: "Communications", url: createPageUrl("Communications"), icon: MessageSquare, access: "communications" },
  { title: "Settings", url: createPageUrl("Settings"), icon: Settings, access: "settings" },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, canView, appRole } = useAuth();

  // Global search keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const navigationItems = allNavigationItems.filter(item => canView(item.access));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3FF] via-[#F0F9FF] to-[#FFF7ED]">
      <style>{`
        .clay-card {
          background: linear-gradient(145deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7));
          box-shadow: 
            8px 8px 20px rgba(139, 92, 246, 0.08),
            -8px -8px 20px rgba(255, 255, 255, 0.9),
            inset 2px 2px 4px rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(10px);
        }
        
        .clay-card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .clay-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 
            12px 12px 28px rgba(139, 92, 246, 0.12),
            -12px -12px 28px rgba(255, 255, 255, 1),
            inset 2px 2px 4px rgba(255, 255, 255, 0.6);
        }
        
        .clay-button {
          background: linear-gradient(145deg, rgba(255,255,255,0.95), rgba(255,255,255,0.8));
          box-shadow: 
            6px 6px 12px rgba(139, 92, 246, 0.1),
            -6px -6px 12px rgba(255, 255, 255, 0.9),
            inset 1px 1px 2px rgba(255, 255, 255, 0.5);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .clay-button:active {
          box-shadow: 
            inset 4px 4px 8px rgba(139, 92, 246, 0.1),
            inset -4px -4px 8px rgba(255, 255, 255, 0.5);
          transform: scale(0.98);
        }
        
        .clay-nav-active {
          background: linear-gradient(145deg, rgba(167, 139, 250, 0.3), rgba(196, 181, 253, 0.2));
          box-shadow: 
            inset 4px 4px 8px rgba(139, 92, 246, 0.15),
            inset -4px -4px 8px rgba(255, 255, 255, 0.5);
        }
        
        .clay-sidebar {
          background: linear-gradient(165deg, rgba(255,255,255,0.85), rgba(255,255,255,0.6));
          box-shadow: 
            12px 0 24px rgba(139, 92, 246, 0.06),
            inset 2px 2px 4px rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(20px);
        }
      `}</style>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 clay-button p-3 rounded-2xl"
      >
        {mobileMenuOpen ? (
          <X className="w-6 h-6 text-purple-600" />
        ) : (
          <Menu className="w-6 h-6 text-purple-600" />
        )}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-screen w-72 clay-sidebar border-r border-white/50 p-6 z-40
        flex flex-col
        transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="mb-6 text-center flex-shrink-0">
          <div className="clay-card rounded-3xl p-6 inline-block">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
              JohnMold
            </h1>
          </div>
        </div>

        {/* Global Search Button */}
        <button
          onClick={() => setSearchOpen(true)}
          className="clay-button rounded-2xl p-3 mb-6 w-full flex items-center gap-3 hover:scale-[1.02] transition-transform"
        >
          <Search className="w-4 h-4 text-purple-400" />
          <span className="text-gray-600 text-sm">Search...</span>
          <kbd className="ml-auto px-2 py-0.5 text-xs bg-gray-100 rounded">⌘K</kbd>
        </button>

        {/* Navigation - Scrollable area */}
        <nav className="space-y-2 flex-1 overflow-y-auto pb-4">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <Link
                key={item.title}
                to={item.url}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3.5 rounded-2xl
                  transition-all duration-300
                  ${isActive ? 'clay-nav-active' : 'clay-button hover:scale-[1.02]'}
                `}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-purple-600' : 'text-purple-400'}`} />
                <span className={`font-medium ${isActive ? 'text-purple-700' : 'text-gray-600'}`}>
                  {item.title}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User Info - Fixed at bottom */}
        <div className="flex-shrink-0 pt-4 border-t border-white/30">
          <div className="clay-card rounded-2xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center shadow-inner">
              <span className="text-white font-bold text-lg">{user?.full_name?.[0]?.toUpperCase() || 'U'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-700 truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-purple-400 truncate">{appRole}</p>
            </div>
            <button
              onClick={() => base44.auth.logout()}
              className="clay-button rounded-xl p-2 hover:scale-110 transition-transform"
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </aside>

      {/* Global Search */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* PWA Components */}
      <OfflineIndicator />
      <PWAInstallBanner />
    </div>
  );
}
